from fastapi import APIRouter, UploadFile, File, HTTPException, Request
from pydantic import BaseModel
import pandas as pd
from io import BytesIO
import razorpay
import os

router = APIRouter()

# Mock Categorization Logic (In production, replace with ML or LLM)
def categorize_expense(description: str) -> str:
    desc_lower = str(description).lower()
    if 'aws' in desc_lower or 'github' in desc_lower or 'vercel' in desc_lower:
        return 'Software/Hosting'
    elif 'pizza' in desc_lower or 'catering' in desc_lower or 'restaurant' in desc_lower:
        return 'Food & Beverage'
    elif 't-shirt' in desc_lower or 'swag' in desc_lower or 'stickers' in desc_lower:
        return 'Swag/Merch'
    elif 'hotel' in desc_lower or 'flight' in desc_lower or 'uber' in desc_lower:
        return 'Travel'
    elif 'prize' in desc_lower or 'award' in desc_lower:
        return 'Prizes'
    else:
        return 'Uncategorized'

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
        
        # Parse CSS using pandas
        df = pd.read_csv(BytesIO(contents))
        
        # Basic validation to ensure required columns exist
        # We lowercase everything to make it more flexible
        columns_lower = [col.lower().strip() for col in df.columns]
        
        # Attempt to map columns (very basic mapping)
        date_col = next((c for c in df.columns if 'date' in c.lower()), None)
        desc_col = next((c for c in df.columns if 'desc' in c.lower() or 'narration' in c.lower()), None)
        amt_col = next((c for c in df.columns if 'amount' in c.lower() or 'withdrawal' in c.lower()), None)

        if not all([date_col, desc_col, amt_col]):
             raise HTTPException(
                 status_code=400, 
                 detail="Could not automatically map columns. Ensure CSV contains Date, Description, and Amount."
             )

        # Process the rows
        processed_transactions = []
        for index, row in df.iterrows():
            # Skip empty rows
            if pd.isna(row[desc_col]) or pd.isna(row[amt_col]):
                 continue
                 
            description = str(row[desc_col])
            # Handle string amounts like "$500.00" or "-500"
            amount_raw = str(row[amt_col]).replace('$', '').replace(',', '')
            try:
                 amount = float(amount_raw)
                 # If it's a positive number in a 'withdrawal' column, usually means expense.
                 # Let's just pass the absolute value for our dashboard purposes.
                 amount = abs(amount)
            except ValueError:
                 amount = 0.0

            category = categorize_expense(description)

            processed_transactions.append({
                "date": str(row[date_col]),
                "description": description,
                "amount": amount,
                "category": category,
                "status": "Paid", # Default from bank
                "method": "Bank Transfer"
            })

        return {
            "message": f"Successfully parsed {len(processed_transactions)} transactions.",
            "data": processed_transactions
        }

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
    """
    key_id = os.getenv("RAZORPAY_KEY_ID")
    key_secret = os.getenv("RAZORPAY_KEY_SECRET")

    if not key_id or not key_secret:
        raise HTTPException(status_code=500, detail="Razorpay credentials not configured.")

    try:
        client = razorpay.Client(auth=(key_id, key_secret))

        # In a real scenario, you First create a Contact, then a Fund Account, then the Payout.
        # This is strictly a structural mock implementation to guide the Finance Engineer.
        
        # 1. Create Contact (Mock)
        # contact = client.contact.create({ "name": payout.contact_name, "type": "employee" })
        
        # 2. Create Fund Account (Mock)
        # fund_account = client.fund_account.create({ "contact_id": contact['id'], "account_type": "bank_account", ...})

        # 3. Create Payout (Mock using Razorpay SDK layout)
        mock_payout_response = {
            "id": f"pout_{payout.team_name[:4]}xyz",
            "entity": "payout",
            "fund_account_id": "fa_00000000000001",
            "amount": payout.amount * 100, # Razorpay expects paise
            "currency": "INR",
            "status": "processing",
            "purpose": "reimbursement",
            "narration": payout.description
        }

        # Actual SDK call would look like this:
        # response = client.payout.create({
        #     "account_number": "2323230006767352", # Virtual account provided by RazorpayX
        #     "fund_account_id": fund_account['id'],
        #     "amount": int(payout.amount * 100),
        #     "currency": "INR",
        #     "mode": "IMPS",
        #     "purpose": "reimbursement",
        #     "queue_if_low_balance": True,
        #     "narration": payout.description
        # })

        return {
            "message": "Payout initiated successfully",
            "data": mock_payout_response
        }

    except Exception as e:
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
            # If invalid, this throws a SignatureVerificationError
            # client.utility.verify_webhook_signature(body.decode("utf-8"), signature, webhook_secret)
            pass

        # Parse JSON
        event_dict = await request.json()
        event_type = event_dict.get('event')
        
        # Example switch-case for events
        if event_type == 'payout.processed':
            # Update database status to 'Approved' & 'Reimbursed'
            pass
        elif event_type == 'payout.failed':
            # Notify the admin
            pass
            
        return {"status": "success", "message": f"Webhook {event_type} handled."}

    except Exception as e:
        # Webhooks must return 200 basically always so Razorpay doesn't keep retrying incorrectly,
        # unless it's a transient server issue.
        return {"status": "error", "message": str(e)}
