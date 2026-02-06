from django.conf import settings
from django.core.mail import send_mail
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from email.utils import formataddr

from .models import AuditLog


def get_client_ip(request):
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def create_audit_log(actor, action, target_type, target_id, summary, ip_address=None):
    AuditLog.objects.create(
        actor=actor,
        action=action,
        target_type=target_type,
        target_id=str(target_id),
        summary=summary,
        ip_address=ip_address
    )


def send_invite_email(user):
    """
    Sends an invite email with a set-password link:
    {FRONTEND_URL}/set-password?uid=<uid>&token=<token>
    """
    frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000").rstrip("/")
    token_generator = PasswordResetTokenGenerator()

    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = token_generator.make_token(user)

    invite_link = f"{frontend_url}/set-password?uid={uid}&token={token}"

    subject = "MFI System Invitation / Account Setup"
    message = (
        f"Hello {user.first_name or user.username},\n\n"
        "You have been invited to access the MFI system.\n"
        "Please click the link below to set your password and activate your account:\n\n"
        f"{invite_link}\n\n"
        "If you did not expect this invitation, you can ignore this email.\n\n"
        "Regards,\nETS NTECH"
    )

    # Build a valid From header. Avoid dots in the display name (e.g., "ETS.NTECH") to prevent parsing errors.
    from_addr = getattr(settings, "DEFAULT_FROM_EMAIL", "") or getattr(settings, "EMAIL_HOST_USER", "")
    if not from_addr:
        # Final fallback (should not happen if your .env is correct)
        from_addr = "no-reply@localhost"

    from_email = formataddr(("ETS NTECH", from_addr))

    send_mail(
        subject=subject,
        message=message,
        from_email=from_email,
        recipient_list=[user.email],
        fail_silently=False,
    )
