"""
Attendance / QR Check-In Router (Set D).

Provides check-in via QR, attendance stats, QR code generation,
and USN-wise QR blast via email (combined with certificate if desired).
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from ..models import AttendanceRecord, CheckInRequest, QRBlastRequest, UserRole, AttendanceStatus
from ..middleware import role_required, get_current_user
from app.core.firebase_config import get_firestore_client
from datetime import datetime, timedelta
import qrcode
import io
import base64
import json

router = APIRouter(prefix="/attendance", tags=["Attendance / Checkin"])


@router.post("/check-in", response_model=AttendanceRecord)
async def check_in(
    request: CheckInRequest,
    current_user: dict = Depends(role_required([UserRole.VOLUNTEER, UserRole.ORGANIZER, UserRole.SUPER_ADMIN]))
):
    """Mark a participant as present for a specific phase."""
    db = get_firestore_client()

    # Decode QR data — may be JSON with expiry or plain UID
    uid = request.qr_data
    try:
        qr_payload = json.loads(request.qr_data)
        uid = qr_payload.get("usn", request.qr_data)
        # Validate expiry if present
        if "expires_at" in qr_payload:
            expires_at = datetime.fromisoformat(qr_payload["expires_at"])
            if datetime.utcnow() > expires_at:
                raise HTTPException(status_code=400, detail="QR code has expired")
    except (json.JSONDecodeError, ValueError):
        pass  # Plain UID string, continue

    # Check if participant exists
    part_ref = db.collection("users").document(uid).get()
    if not part_ref.exists:
        raise HTTPException(status_code=404, detail="Participant not found")

    # Check if attendance already marked
    att_ref = db.collection("attendance").document(f"{uid}_{request.phase_id}").get()
    if att_ref.exists:
        raise HTTPException(status_code=400, detail="Attendance already marked for this phase")

    new_record = AttendanceRecord(
        uid=uid,
        phase_id=request.phase_id,
        status=AttendanceStatus.PRESENT,
        recorded_by=current_user["uid"]
    )

    db.collection("attendance").document(f"{uid}_{request.phase_id}").set(new_record.dict())
    return new_record


@router.get("/stats/{phase_id}")
async def get_attendance_stats(
    phase_id: str,
    current_user: dict = Depends(role_required([UserRole.ORGANIZER, UserRole.SUPER_ADMIN, UserRole.ADMIN]))
):
    """Get attendance statistics for a specific phase."""
    db = get_firestore_client()
    docs = db.collection("attendance").where("phase_id", "==", phase_id).stream()

    total_present = 0
    records = []
    for doc in docs:
        total_present += 1
        records.append(doc.to_dict())

    return {"phase_id": phase_id, "total_present": total_present, "records": records}


def _generate_qr_base64(data: str, box_size: int = 6) -> str:
    """Generate a QR code as a base64 PNG string."""
    qr = qrcode.QRCode(version=1, box_size=box_size, border=2)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    return base64.b64encode(buffer.getvalue()).decode("utf-8")


@router.get("/qr/{usn}")
async def generate_qr_for_usn(
    usn: str,
    event_id: str = "hackodyssey2026",
    expiry_hours: int = 24
):
    """Generate a QR code for a specific USN with expiry. Returns base64 PNG."""
    expires_at = (datetime.utcnow() + timedelta(hours=expiry_hours)).isoformat()
    qr_payload = json.dumps({
        "usn": usn,
        "event_id": event_id,
        "expires_at": expires_at,
        "type": "attendance"
    })
    qr_b64 = _generate_qr_base64(qr_payload)
    return {
        "usn": usn,
        "qr_base64": qr_b64,
        "expires_at": expires_at,
        "event_id": event_id
    }


@router.post("/qr-blast")
async def blast_qr_codes(
    request: QRBlastRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(role_required([UserRole.SUPER_ADMIN, UserRole.ORGANIZER, UserRole.ADMIN]))
):
    """
    Blast QR attendance codes to participants via email.
    Each participant gets a personalized QR code with expiry embedded in the same
    email as their participation certificate (if include_certificate is True).
    Uses the same SMTP infrastructure as certificate blasting.
    """
    import smtplib
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText
    from email.mime.image import MIMEImage
    from email.mime.application import MIMEApplication
    import os

    db = get_firestore_client()

    # Validate USNs exist and gather user data
    users_data = []
    for usn in request.usns:
        user_doc = db.collection("users").document(usn).get()
        if user_doc.exists:
            udata = user_doc.to_dict()
            udata["uid"] = usn
            users_data.append(udata)

    if not users_data:
        raise HTTPException(status_code=404, detail="No valid users found for the provided USNs")

    expires_at = (datetime.utcnow() + timedelta(hours=request.expiry_hours)).isoformat()

    def _send_qr_emails():
        """Background task: generate QR + optional cert for each user and email."""
        SMTP_SERVER = os.environ.get("SMTP_SERVER", "smtp.gmail.com")
        SMTP_PORT = int(os.environ.get("SMTP_PORT", 587))
        SMTP_USERNAME = os.environ.get("SMTP_USERNAME")
        SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD")

        for user in users_data:
            email = user.get("email")
            name = user.get("display_name", user.get("uid", "Participant"))
            usn = user["uid"]

            if not email:
                continue

            # Generate QR code
            qr_payload = json.dumps({
                "usn": usn,
                "event_id": request.event_id,
                "expires_at": expires_at,
                "type": "attendance"
            })
            qr_b64 = _generate_qr_base64(qr_payload, box_size=8)
            qr_bytes = base64.b64decode(qr_b64)

            # Build email
            msg = MIMEMultipart("related")
            msg["Subject"] = f"🎫 Your HackOdyssey 2026 QR Badge — {name}"
            msg["To"] = email

            # HTML body with inline QR image
            expiry_display = datetime.fromisoformat(expires_at).strftime("%d %b %Y, %I:%M %p UTC")
            html_body = f"""
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px; background: #f8fafc; border-radius: 12px;">
                <div style="text-align: center; margin-bottom: 24px;">
                    <h1 style="color: #0f172a; margin: 0;">🎫 HackOdyssey 2026</h1>
                    <p style="color: #64748b; font-size: 14px;">Your Digital Attendance Badge</p>
                </div>
                <div style="background: white; border-radius: 12px; padding: 24px; text-align: center; border: 1px solid #e2e8f0;">
                    <h2 style="color: #1e293b; margin: 0 0 4px 0;">Hello, {name}!</h2>
                    <p style="color: #64748b; font-size: 13px; margin: 0 0 20px 0;">USN: <strong>{usn}</strong></p>
                    <div style="background: #f1f5f9; border-radius: 12px; padding: 20px; display: inline-block;">
                        <img src="cid:qr_badge" width="200" height="200" alt="QR Badge" style="border-radius: 8px;" />
                    </div>
                    <p style="color: #94a3b8; font-size: 12px; margin-top: 16px;">
                        ⏰ Valid until: <strong>{expiry_display}</strong>
                    </p>
                    <p style="color: #64748b; font-size: 13px; margin-top: 12px;">
                        Show this QR code at the venue for quick check-in.<br/>
                        Do not share this code with anyone.
                    </p>
                </div>
                <p style="color: #94a3b8; font-size: 11px; text-align: center; margin-top: 20px;">
                    This is an automated email from HackOdyssey Event Management System.
                </p>
            </div>
            """

            alt_part = MIMEMultipart("alternative")
            alt_part.attach(MIMEText(html_body, "html"))
            msg.attach(alt_part)

            # Attach QR as inline image
            qr_image = MIMEImage(qr_bytes, _subtype="png")
            qr_image.add_header("Content-ID", "<qr_badge>")
            qr_image.add_header("Content-Disposition", "inline", filename=f"{usn}_qr_badge.png")
            msg.attach(qr_image)

            # Optionally attach certificate PDF
            if request.include_certificate:
                try:
                    from app.routers.automation import generate_certificate_pdf, CertificateRequest
                    cert_data = CertificateRequest(
                        name=name,
                        role="Participant",
                        track="General",
                        email=email
                    )
                    cert_bytes = generate_certificate_pdf(cert_data)
                    cert_part = MIMEApplication(cert_bytes, Name=f"{name.replace(' ', '_')}_Certificate.pdf")
                    cert_part["Content-Disposition"] = f'attachment; filename="{name.replace(" ", "_")}_Certificate.pdf"'
                    msg.attach(cert_part)
                except Exception as cert_err:
                    print(f"Certificate generation failed for {usn}: {cert_err}")

            # Send
            if SMTP_USERNAME and SMTP_PASSWORD:
                try:
                    msg["From"] = SMTP_USERNAME
                    server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
                    server.starttls()
                    server.login(SMTP_USERNAME, SMTP_PASSWORD)
                    server.sendmail(SMTP_USERNAME, [email], msg.as_string())
                    server.quit()
                except Exception as e:
                    print(f"SMTP error for {usn}: {e}")
            else:
                print(f"[SIMULATED QR EMAIL] To: {email}, USN: {usn}, Cert: {request.include_certificate}")

    background_tasks.add_task(_send_qr_emails)

    return {
        "message": f"QR blast queued for {len(users_data)} participant(s)",
        "expires_at": expires_at,
        "include_certificate": request.include_certificate,
        "users_processed": [u["uid"] for u in users_data]
    }
