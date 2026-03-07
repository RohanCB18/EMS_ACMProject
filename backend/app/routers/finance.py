from fastapi import APIRouter, UploadFile, File, HTTPException, Request
from pydantic import BaseModel
import pandas as pd
from io import BytesIO
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


