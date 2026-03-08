from fastapi import APIRouter, UploadFile, File, HTTPException, Request
from pydantic import BaseModel
import pandas as pd
from io import BytesIO
import razorpay
import os

router = APIRouter()

from openai import OpenAI

# Valid categories for the hackathon finance dashboard
VALID_CATEGORIES = ["Software/Hosting", "Food & Beverage", "Swag/Merch", "Travel", "Prizes", "Sponsorship", "Uncategorized"]

# Rule-based fallback categorizer (used when no API key is set)
def _rule_based_categorize(description: str) -> str:
    desc = description.lower()
    if any(k in desc for k in ['aws', 'github', 'vercel', 'azure', 'gcp', 'stripe', 'digitalocean']):
        return 'Software/Hosting'
    elif any(k in desc for k in ['pizza', 'catering', 'restaurant', 'domino', 'zomato', 'swiggy', 'costco', 'food']):
        return 'Food & Beverage'
    elif any(k in desc for k in ['t-shirt', 'swag', 'sticker', 'customink', 'merch', 'printful']):
        return 'Swag/Merch'
    elif any(k in desc for k in ['hotel', 'flight', 'uber', 'ola', 'airbnb', 'rapido', 'makemytrip']):
        return 'Travel'
    elif any(k in desc for k in ['prize', 'award', 'reward', 'bounty']):
        return 'Prizes'
    elif any(k in desc for k in ['sponsor', 'google', 'microsoft', 'amazon', 'meta']):
        return 'Sponsorship'
    else:
        return 'Uncategorized'

# Smart AI-powered categorizer using OpenRouter
def categorize_expense(description: str) -> str:
    api_key = os.getenv("OPENROUTER_API_KEY")

    # If no API key is configured, use the rule-based fallback directly
    if not api_key:
        return _rule_based_categorize(description)

    try:
        client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=api_key,
        )

        response = client.chat.completions.create(
            model="openrouter/auto",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a finance AI for a hackathon event. Your job is to categorize bank transactions. "
                        "Classify into EXACTLY one of these categories: "
                        "Software/Hosting, Food & Beverage, Swag/Merch, Travel, Prizes, Sponsorship, Uncategorized. "
                        "Reply with ONLY the category name and nothing else."
                    )
                },
                {
                    "role": "user",
                    "content": f'Categorize this bank transaction: "{description}"'
                }
            ],
            max_tokens=10,
        )

        category = response.choices[0].message.content.strip()

        # Validate the response is one of our expected categories
        if category in VALID_CATEGORIES:
            return category
        else:
            return _rule_based_categorize(description)

    except Exception:
        # If the API call fails for any reason, silently fallback to rules
        return _rule_based_categorize(description)

@router.get("/")
def test_finance():
    return {"message": "Finance router is working"}

@router.post("/upload")
async def ingest_bank_statement(file: UploadFile = File(...)):
    """
    Ingests a CSV bank statement.
    Expected CSV columns: Date, Description, Amount
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed.")

    try:
        # Read the uploaded file into memory
        contents = await file.read()
        
        # Parse CSV, trying utf-8 first (utf-16 for Windows-exported SBI files)
        try:
            df = pd.read_csv(BytesIO(contents), encoding='utf-8')
        except UnicodeDecodeError:
            df = pd.read_csv(BytesIO(contents), encoding='utf-16')
        
        # Normalize column names
        df.columns = [col.strip() for col in df.columns]

        # --- SBI Format Column Detection ---
        # Expected SBI columns: Txn Date | Value Date | Description | Ref No./Cheque No. | Debit | Credit | Balance
        date_col   = next((c for c in df.columns if 'date' in c.lower()), None)
        desc_col   = next((c for c in df.columns if 'desc' in c.lower()), None)
        debit_col  = next((c for c in df.columns if 'debit' in c.lower()), None)
        credit_col = next((c for c in df.columns if 'credit' in c.lower()), None)

        # Validate SBI format strictly
        missing = [name for name, col in [("Txn Date", date_col), ("Description", desc_col), ("Debit", debit_col), ("Credit", credit_col)] if not col]
        if missing:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid format. This system only accepts SBI bank statement CSVs. Missing columns: {', '.join(missing)}. "
                       f"Please download your statement from SBI NetBanking as CSV and try again."
            )

        # --- Row Processing (SBI: Debit = expense, Credit = income/sponsorship) ---
        processed_transactions = []
        for _, row in df.iterrows():
            if pd.isna(row[desc_col]):
                continue

            description = str(row[desc_col]).strip()

            debit  = float(str(row[debit_col]).replace(',', '').strip())  if not pd.isna(row[debit_col])  and str(row[debit_col]).strip()  else 0.0
            credit = float(str(row[credit_col]).replace(',', '').strip()) if not pd.isna(row[credit_col]) and str(row[credit_col]).strip() else 0.0

            if debit > 0:
                amount = debit
            elif credit > 0:
                amount = credit
            else:
                continue  # skip zero-amount rows

            category = categorize_expense(description)

            processed_transactions.append({
                "date":        str(row[date_col]).strip(),
                "description": description,
                "amount":      round(amount, 2),
                "category":    category,
                "status":      "Paid",
                "method":      "Bank Transfer"
            })

        return {
            "message": f"Successfully parsed {len(processed_transactions)} transactions.",
            "data": processed_transactions
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error parsing CSV: {str(e)}")

# --- Razorpay Integrations ---

class PayoutRequest(BaseModel):
    team_name: str
    contact_name: str
    amount: float
    description: str = "Hackathon Reimbursement"
    account_number: str
    ifsc: str

@router.post("/payout")
async def process_reimbursement(payout: PayoutRequest):
    """
    Initiates a RazorpayX payout for expense reimbursement or prize money.
    Uses direct HTTP requests to the RazorpayX REST API (Test Mode).
    """
    import requests as http_requests

    key_id = os.getenv("RAZORPAY_KEY_ID")
    key_secret = os.getenv("RAZORPAY_KEY_SECRET")

    if not key_id or not key_secret:
        raise HTTPException(status_code=500, detail="Razorpay credentials not configured.")

    auth = (key_id, key_secret)
    headers = {"Content-Type": "application/json"}
    base_url = "https://api.razorpay.com/v1"

    try:
        # 1. Create a Contact in RazorpayX
        contact_resp = http_requests.post(
            f"{base_url}/contacts",
            auth=auth,
            headers=headers,
            json={
                "name": payout.contact_name,
                "type": "employee",
                "reference_id": f"team_{payout.team_name[:10].replace(' ', '_')}"
            }
        )
        if not contact_resp.ok:
            raise Exception(f"Contact creation failed: {contact_resp.text}")
        contact = contact_resp.json()

        # 2. Add a Fund Account (Bank Account) to that Contact
        fund_resp = http_requests.post(
            f"{base_url}/fund_accounts",
            auth=auth,
            headers=headers,
            json={
                "contact_id": contact['id'],
                "account_type": "bank_account",
                "bank_account": {
                    "name": payout.contact_name,
                    "ifsc": payout.ifsc,
                    "account_number": payout.account_number
                }
            }
        )
        if not fund_resp.ok:
            raise Exception(f"Fund account creation failed: {fund_resp.text}")
        fund_account = fund_resp.json()

        # 3. Create the Payout (amount in paise)
        payout_resp = http_requests.post(
            f"{base_url}/payouts",
            auth=auth,
            headers=headers,
            json={
                "account_number": "2323230006767352",  # RazorpayX Test virtual account
                "fund_account_id": fund_account['id'],
                "amount": int(payout.amount * 100),  # paise
                "currency": "INR",
                "mode": "IMPS",
                "purpose": "reimbursement",
                "queue_if_low_balance": True,
                "reference_id": f"ref_{payout.team_name[:5]}",
                "narration": payout.description[:30]
            }
        )
        if not payout_resp.ok:
            raise Exception(f"Payout creation failed: {payout_resp.text}")

        response = payout_resp.json()

        return {
            "message": "Payout initiated successfully",
            "data": response
        }

    except Exception as e:
        print(f"[Razorpay Error]: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/webhook/razorpay")
async def razorpay_webhook_listener(request: Request):
    """
    Listens for Razorpay webhook events like 'payout.processed' or 'payout.failed'
    to automatically update the database without manual checks.
    """
    webhook_secret = os.getenv("RAZORPAY_WEBHOOK_SECRET")
    
    try:
        body = await request.body()
        signature = request.headers.get("x-razorpay-signature", "")
        
        if webhook_secret:
            # Verify the webhook signature to ensure it's actually from Razorpay
            client = razorpay.Client(auth=(os.getenv("RAZORPAY_KEY_ID"), os.getenv("RAZORPAY_KEY_SECRET")))
            # This throws a SignatureVerificationError if someone tries to fake a ping
            client.utility.verify_webhook_signature(body.decode("utf-8"), signature, webhook_secret)

        # Parse JSON
        event_dict = await request.json()
        event_type = event_dict.get('event')
        
        # In a real scenario, this would connect to Firestore (Set A/C)
        print(f"💰 [WEBHOOK RECEIVED]: {event_type}")
        
        # Example switch-case for events
        if event_type == 'payout.processed':
            payout_id = event_dict['payload']['payout']['entity']['id']
            ref_id = event_dict['payload']['payout']['entity']['reference_id']
            print(f"✅ SUCCESS: Payout {payout_id} for {ref_id} cleared!")
            # Update database status to 'Paid'
            
        elif event_type == 'payout.failed':
            payout_id = event_dict['payload']['payout']['entity']['id']
            reason = event_dict['payload']['payout']['entity']['failure_reason']
            print(f"❌ FAILED: Payout {payout_id} failed. Reason: {reason}")
            # Route an alert to the Admin dashboard
            
        return {"status": "success", "message": f"Webhook {event_type} handled."}

    except Exception as e:
        # Webhooks must return 200 basically always so Razorpay doesn't keep retrying incorrectly,
        # unless it's a transient server issue.
        return {"status": "error", "message": str(e)}
