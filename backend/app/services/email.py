"""
Email sending service for SmartRAG.

Supports:
- SMTP with STARTTLS / SSL
- HTML and plain-text fallback templates
- Graceful local dev fallback: logs to console if SMTP is not configured
"""

import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings

logger = logging.getLogger(__name__)


def send_email(
    to_email: str,
    subject: str,
    html_content: str,
    text_content: str | None = None,
) -> bool:
    """Send an email using SMTP or log to console if SMTP is not configured."""
    if not settings.smtp_host:
        logger.info(
            "\n" + "=" * 60 + "\n"
            f"[EMAIL (DEV MODE - No SMTP configured)]\n"
            f"To: {to_email}\n"
            f"Subject: {subject}\n"
            f"Content:\n{text_content or html_content}\n"
            + "=" * 60
        )
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.email_from
        msg["To"] = to_email

        if text_content:
            msg.attach(MIMEText(text_content, "plain", "utf-8"))
        msg.attach(MIMEText(html_content, "html", "utf-8"))

        if settings.smtp_ssl:
            server = smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=10)
        else:
            server = smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10)
            if settings.smtp_tls:
                server.starttls()

        if settings.smtp_user and settings.smtp_password:
            server.login(settings.smtp_user, settings.smtp_password)

        server.send_message(msg)
        server.quit()
        logger.info("Email sent successfully to %s: %s", to_email, subject)
        return True
    except Exception as exc:
        logger.error("Failed to send email to %s: %s", to_email, exc, exc_info=True)
        return False


def build_invitation_email_html(
    inviter_name: str,
    workspace_name: str,
    role: str,
    invite_url: str,
    expires_in_hours: int = 48,
) -> str:
    """Generate responsive HTML email for workspace invitations."""
    return f"""<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation à rejoindre {workspace_name}</title>
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      color: #1e293b;
      margin: 0;
      padding: 24px;
    }}
    .container {{
      max-width: 560px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }}
    .header {{
      background-color: #0f172a;
      color: #ffffff;
      padding: 24px 32px;
      text-align: center;
    }}
    .header h1 {{
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.02em;
    }}
    .content {{
      padding: 32px;
      line-height: 1.6;
      font-size: 15px;
    }}
    .badge {{
      display: inline-block;
      background: #e0f2fe;
      color: #0369a1;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
    }}
    .btn-container {{
      text-align: center;
      margin: 32px 0;
    }}
    .btn {{
      display: inline-block;
      background-color: #0284c7;
      color: #ffffff !important;
      text-decoration: none;
      padding: 12px 28px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 15px;
    }}
    .footer {{
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      padding: 16px 32px;
      font-size: 12px;
      color: #64748b;
      text-align: center;
    }}
    .link-fallback {{
      word-break: break-all;
      color: #64748b;
      font-size: 12px;
      margin-top: 20px;
    }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>SmartRAG Platform</h1>
    </div>
    <div class="content">
      <p>Bonjour,</p>
      <p><strong>{inviter_name}</strong> vous a invité(e) à rejoindre le workspace <strong>{workspace_name}</strong> avec le rôle <span class="badge">{role}</span>.</p>
      <p>Accédez aux bases de connaissances documentaires de l'équipe et commencez à interroger vos documents en toute sécurité.</p>

      <div class="btn-container">
        <a href="{invite_url}" class="btn">Accepter l'invitation</a>
      </div>

      <p class="link-fallback">
        Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
        <a href="{invite_url}">{invite_url}</a>
      </p>

      <p style="font-size: 13px; color: #94a3b8; margin-top: 24px;">
        * Ce lien d'invitation expirera dans {expires_in_hours} heures.
      </p>
    </div>
    <div class="footer">
      Cet email a été envoyé automatiquement par SmartRAG Platform.
    </div>
  </div>
</body>
</html>
"""


def send_workspace_invitation_email(
    to_email: str,
    inviter_name: str,
    workspace_name: str,
    role: str,
    invite_url: str,
    expires_in_hours: int = 48,
) -> bool:
    """Send a workspace invitation email."""
    subject = f"Invitation à rejoindre le workspace '{workspace_name}' — SmartRAG"
    html_content = build_invitation_email_html(
        inviter_name=inviter_name,
        workspace_name=workspace_name,
        role=role,
        invite_url=invite_url,
        expires_in_hours=expires_in_hours,
    )
    text_content = (
        f"Bonjour,\n\n"
        f"{inviter_name} vous a invité(e) à rejoindre le workspace '{workspace_name}' ({role}) sur SmartRAG.\n\n"
        f"Pour accepter l'invitation, rendez-vous sur le lien suivant :\n"
        f"{invite_url}\n\n"
        f"(Ce lien expire dans {expires_in_hours} heures)\n"
    )
    return send_email(
        to_email=to_email,
        subject=subject,
        html_content=html_content,
        text_content=text_content,
    )
