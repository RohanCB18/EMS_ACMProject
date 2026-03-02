from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
import os
# import pdfkit # In production, requires wkhtmltopdf installed on the OS
import smtplib
from email.message import EmailMessage
from typing import List

router = APIRouter()

@router.get("/")
def test_automation():
    return {"message": "Automation router is working"}

# --- Certificate Generation ---

class CertificateRequest(BaseModel):
    participant_name: str
    track: str
    award: str = "Participant"
    include_qr: bool = True

@router.post("/certificate/generate")
async def generate_certificate(request: CertificateRequest, background_tasks: BackgroundTasks):
    """
    Generates a PDF certificate by injecting data into an HTML template.
    Usually run as a background task if doing bulk generation.
    """
    try:
        # 1. Very basic HTML string acting as our Jinja template
        html_template = f"""
        <html>
        <head>
            <style>
                body {{ font-family: 'Arial', sans-serif; text-align: center; padding: 50px; border: 10px solid #ccc; }}
                h1 {{ color: #333; }}
                .name {{ font-size: 30px; font-weight: bold; color: #007bff; margin: 20px 0; }}
                .award {{ font-size: 20px; color: #555; }}
            </style>
        </head>
        <body>
            <h1>Certificate of Achievement</h1>
            <p>This certifies that</p>
            <div class="name">{request.participant_name}</div>
            <p>has successfully participated as a <strong>{request.award}</strong></p>
            <div class="award">in the {request.track} Track</div>
            <br/><br/>
            { '<img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=VERIFIED" />' if request.include_qr else '' }
        </body>
        </html>
        """

        # 2. In a real environment, convert HTML to PDF
        # pdf_buffer = pdfkit.from_string(html_template, False)
        
        # 3. Save to storage or return as StreamingResponse
        # For now, we just simulate success.
        
        return {
            "status": "success",
            "message": f"Generated certificate for {request.participant_name}",
            "mock_html_preview": html_template
        }
        
    except Exception as e:
         raise HTTPException(status_code=500, detail=str(e))

# --- Email Automation ---

class EmailBlastRequest(BaseModel):
    recipients: List[str]
    subject: str
    body_markdown: str

def send_email_task(recipient: str, subject: str, content: str):
    """
    Background worker function that sends the actual SMTP request.
    """
    smtp_host = os.getenv("SMTP_HOST")
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASS")
    from_email = os.getenv("FROM_EMAIL")
    
    if not all([smtp_host, smtp_user, smtp_pass, from_email]):
        print(f"SMTP Mock: Sending '{subject}' to {recipient}")
        return # Skip actual sending if not configured
        
    try:
        msg = EmailMessage()
        msg.set_content(content) # A real app would convert markdown to HTML here
        msg['Subject'] = subject
        msg['From'] = from_email
        msg['To'] = recipient

        server = smtplib.SMTP(smtp_host, 587)
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.send_message(msg)
        server.quit()
    except Exception as e:
        print(f"Failed to send email to {recipient}: {e}")

@router.post("/email/blast")
async def broadcast_email(request: EmailBlastRequest, background_tasks: BackgroundTasks):
    """
    Accepts markdown email content and iterates through the recipient list 
    to send the emails via background tasks (preventing API timeout).
    """
    if not request.recipients:
         raise HTTPException(status_code=400, detail="No recipients provided.")
         
    # Hand off the sending to background tasks so the HTTP response is immediate
    for recipient in request.recipients:
        # Example: Simple markdown replacements (e.g. {{first_name}} could be parsed here)
        personalized_content = request.body_markdown.replace("{{email}}", recipient)
        
        background_tasks.add_task(
            send_email_task, 
            recipient, 
            request.subject, 
            personalized_content
        )

    return {
        "status": "success",
        "message": f"Queued {len(request.recipients)} emails for dispatch."
    }
