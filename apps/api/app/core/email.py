"""
SMTP email utility for Logan Virtual.

Uses settings from core/config.py (SMTP_HOST, SMTP_PORT, etc.).
In development, emails go to Mailpit (http://localhost:8025).
In production, point SMTP_HOST to a real mail server.
"""

import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings

logger = logging.getLogger(__name__)


def send_email(
    to: str,
    subject: str,
    body_html: str,
    body_text: str | None = None,
    reply_to: str | None = None,
) -> bool:
    """
    Send an email via SMTP.

    Returns True on success, False on failure (never raises).
    """
    if not to or not subject:
        logger.warning("send_email called with empty 'to' or 'subject'")
        return False

    msg = MIMEMultipart("alternative")
    msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
    msg["To"] = to
    msg["Subject"] = subject
    if reply_to:
        msg["Reply-To"] = reply_to

    # Plain text fallback
    if body_text:
        msg.attach(MIMEText(body_text, "plain", "utf-8"))

    # HTML body
    msg.attach(MIMEText(body_html, "html", "utf-8"))

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
            # Only authenticate if credentials are provided
            if settings.SMTP_USER and settings.SMTP_PASSWORD:
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_FROM_EMAIL, [to], msg.as_string())
        logger.info("Email sent to %s: %s", to, subject)
        return True
    except Exception as exc:
        logger.error("Failed to send email to %s: %s", to, exc)
        return False
