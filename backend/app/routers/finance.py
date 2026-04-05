from fastapi import APIRouter, UploadFile, File, HTTPException, Request
from pydantic import BaseModel
import pandas as pd
from io import BytesIO
import os
from datetime import datetime, timedelta
from app.core.firebase_config import get_storage_bucket, get_firestore_client
from firebase_admin import firestore
from app.middleware import get_current_user
from fastapi import APIRouter, UploadFile, File, HTTPException, Request, Depends

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


@router.post("/upload-receipt")
async def upload_receipt(file: UploadFile = File(...)):
    """
    Uploads a receipt image to Firebase Storage and returns the download URL.
    This bypasses CORS issues by performing the upload server-side.
    """
    try:
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="Only image files are allowed.")

        bucket = get_storage_bucket()
        
        # Create a unique filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"reimbursements/{timestamp}_{file.filename}"
        blob = bucket.blob(filename)

        # Read the file content
        content = await file.read()
        
        # Upload to Storage
        blob.upload_from_string(
            content,
            content_type=file.content_type
        )

        # Make public or generate a long-lived signed URL
        # For simplicity in this demo, we'll use a signed URL valid for 1 year
        url = blob.generate_signed_url(
            version="v4",
            expiration=timedelta(days=365),
            method="GET",
        )

        return {"url": url}

    except Exception as e:
        print(f"Error in upload_receipt: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to upload receipt: {str(e)}")

class ReimbursementSubmit(BaseModel):
    volunteer_name: str
    volunteer_usn: str
    volunteer_mobile: str
    item_description: str
    amount: float
    tx_id: str
    receipt_url: str

@router.post("/reimbursements")
async def submit_reimbursement(
    reimbursement: ReimbursementSubmit,
    current_user: dict = Depends(get_current_user)
):
    try:
        db = get_firestore_client()
        data = reimbursement.dict()
        data["status"] = "pending"
        data["created_at"] = firestore.SERVER_TIMESTAMP
        data["user_id"] = current_user.get("uid", "anonymous")
        
        doc_ref = db.collection("reimbursements").document()
        doc_ref.set(data)
        
        return {"message": "Reimbursement submitted successfully", "id": doc_ref.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to submit reimbursement: {str(e)}")

@router.get("/reimbursements")
async def get_reimbursements(
    current_user: dict = Depends(get_current_user)
):
    try:
        db = get_firestore_client()
        docs = db.collection("reimbursements").order_by("created_at", direction=firestore.Query.DESCENDING).stream()
        
        reims = []
        for doc in docs:
            data = doc.to_dict()
            if "created_at" in data:
                data.pop("created_at")
            reims.append({**data, "id": doc.id})
            
        return reims
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch reimbursements: {str(e)}")

class ReimbursementStatusUpdate(BaseModel):
    status: str

@router.put("/reimbursements/{reimbursement_id}")
async def update_reimbursement_status(
    reimbursement_id: str,
    update: ReimbursementStatusUpdate,
    current_user: dict = Depends(get_current_user)
):
    try:
        db = get_firestore_client()
        doc_ref = db.collection("reimbursements").document(reimbursement_id)
        doc_ref.update({"status": update.status})
        return {"message": "Status updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update reimbursement: {str(e)}")
