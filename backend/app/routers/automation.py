from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, EmailStr
from fastapi.responses import Response
import io
import qrcode
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import landscape, A4
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
import os

router = APIRouter()

# --- Certificate Generation Logic ---

class CertificateRequest(BaseModel):
    name: str
    role: str = "Participant"
    track: str = "General"
    project_name: str = ""
    email: EmailStr | None = None

def generate_certificate_pdf(data: CertificateRequest) -> bytes:
    buffer = io.BytesIO()
    
    # Setup landscape A4 canvas
    c = canvas.Canvas(buffer, pagesize=landscape(A4))
    width, height = landscape(A4)
    
    # 1. Background styling
    # Draw a clean border
    c.setStrokeColor(HexColor("#3b82f6")) # Blue border
    c.setLineWidth(10)
    c.rect(20, 20, width - 40, height - 40)
    
    # Inner border
    c.setStrokeColor(HexColor("#cbd5e1")) 
    c.setLineWidth(2)
    c.rect(35, 35, width - 70, height - 70)

    # 2. Header
    c.setFont("Helvetica-Bold", 36)
    c.setFillColor(HexColor("#0f172a"))
    c.drawCentredString(width / 2.0, height - 120, "CERTIFICATE OF ACHIEVEMENT")
    
    c.setFont("Helvetica", 16)
    c.setFillColor(HexColor("#64748b"))
    c.drawCentredString(width / 2.0, height - 160, "This is to certify that")
    
    # 3. Name (Dynamically injected)
    c.setFont("Helvetica-Bold", 48)
    c.setFillColor(HexColor("#2563eb"))
    c.drawCentredString(width / 2.0, height - 240, data.name.upper())
    
    # 4. Body logic
    c.setFont("Helvetica", 16)
    c.setFillColor(HexColor("#475569"))
    
    if data.role.lower() == "winner":
        body_text = f"has emerged as a WINNER in the {data.track} track"
    else:
        body_text = f"has successfully participated as a {data.role}"
        
    c.drawCentredString(width / 2.0, height - 300, body_text)
    c.drawCentredString(width / 2.0, height - 330, "at the HackOdyssey 2026 Global Hackathon.")
    
    if data.project_name:
         c.setFont("Helvetica-Oblique", 14)
         c.drawCentredString(width / 2.0, height - 370, f"Project: {data.project_name}")

    # 5. Signatures
    c.setFont("Helvetica-Bold", 14)
    c.setFillColor(HexColor("#0f172a"))
    c.drawString(150, 100, "_________________________")
    c.drawString(170, 80, "Lead Organizer")
    
    c.drawString(width - 350, 100, "_________________________")
    c.drawString(width - 320, 80, "Technical Director")
    
    # 6. Generate and embed QR Code for authenticity
    qr = qrcode.QRCode(box_size=4, border=2)
    qr.add_data(f"HackOdyssey Verification\\nName: {data.name}\\nRole: {data.role}\\nID: HO26-{hash(data.name) % 100000}")
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white")
    
    # Save QR to a temporary precise BytesIO stream for reportlab
    img_buffer = io.BytesIO()
    qr_img.save(img_buffer, format="PNG")
    img_buffer.seek(0)
    
    from reportlab.lib.utils import ImageReader
    c.drawImage(ImageReader(img_buffer), width / 2.0 - 40, 60, width=80, height=80)
    c.setFont("Helvetica", 8)
    c.drawCentredString(width / 2.0, 45, "Scan to verify authenticity")

    c.showPage()
    c.save()
    
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes

@router.post("/certificates/generate")
async def generate_certificate(request: CertificateRequest):
    """
    Generates a PDF certificate and returns it as a downloadable file.
    """
    try:
        pdf_bytes = generate_certificate_pdf(request)
        
        # Return as a file download response
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={request.name.replace(' ', '_')}_Certificate.pdf"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate certificate: {str(e)}")

# --- Email Automation Logic ---

class EmailBlastRequest(BaseModel):
    to_emails: list[EmailStr]
    subject: str
    body: str # HTML or Markdown
    include_certificate_for: str | None = None
    role: str = "Participant"
    track: str = "General"
    project_name: str = ""

def send_smtp_email(to_emails: list[str], subject: str, body: str, attachment_bytes: bytes = None, attachment_name: str = None):
    # Retrieve credentials from .env (we will mock this if not configured so the app doesn't crash)
    SMTP_SERVER = os.environ.get("SMTP_SERVER", "smtp.gmail.com")
    SMTP_PORT = int(os.environ.get("SMTP_PORT", 587))
    SMTP_USERNAME = os.environ.get("SMTP_USERNAME")
    SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD")

    if not SMTP_USERNAME or not SMTP_PASSWORD:
        # For hackathon/testing purposes, if no env vars, just print to console and 'simulate' success
        print(f"\\n[SIMULATED EMAIL] To: {to_emails}\\nSubject: {subject}\\nBody: {body}\\n")
        if attachment_bytes:
             print(f"-> Includes attachment: {attachment_name}\\n")
        return True

    try:
        msg = MIMEMultipart()
        msg['From'] = SMTP_USERNAME
        msg['To'] = ", ".join(to_emails)
        msg['Subject'] = subject

        msg.attach(MIMEText(body, 'html'))

        if attachment_bytes and attachment_name:
            part = MIMEApplication(attachment_bytes, Name=attachment_name)
            part['Content-Disposition'] = f'attachment; filename="{attachment_name}"'
            msg.attach(part)

        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        text = msg.as_string()
        server.sendmail(SMTP_USERNAME, to_emails, text)
        server.quit()
        return True
    except Exception as e:
        print(f"SMTP Error: {str(e)}")
        raise e

@router.post("/email/blast")
async def email_blast(request: EmailBlastRequest, background_tasks: BackgroundTasks):
    """
    Sends an email blast to an array of users.
    Can optionally generate and attach a certificate on the fly.
    """
    try:
        attachment_bytes = None
        attachment_name = None
        
        # Optionally generate a certificate to attach
        if request.include_certificate_for:
            cert_data = CertificateRequest(
                name=request.include_certificate_for,
                role=request.role,
                track=request.track,
                project_name=request.project_name,
                email=request.to_emails[0] # assuming single recipient for personalized certs usually
            )
            attachment_bytes = generate_certificate_pdf(cert_data)
            attachment_name = f"{request.include_certificate_for.replace(' ', '_')}_Certificate.pdf"

        # Send email in background so the API returns quickly
        background_tasks.add_task(
            send_smtp_email, 
            request.to_emails, 
            request.subject, 
            request.body,
            attachment_bytes,
            attachment_name
        )
        
        return {"message": f"Successfully queued email(s) to {len(request.to_emails)} recipient(s)."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to queue emails: {str(e)}")
