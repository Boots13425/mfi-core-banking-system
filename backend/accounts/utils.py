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


def _build_from_email():
    from_addr = getattr(settings, "DEFAULT_FROM_EMAIL", "") or getattr(settings, "EMAIL_HOST_USER", "")
    if not from_addr:
        from_addr = "no-reply@localhost"
    return formataddr(("MFI TEAM", from_addr))


def generate_set_password_link(user):
    """
    Build the frontend URL used for both invite and password reset flows.
    """
    frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000").rstrip("/")
    token_generator = PasswordResetTokenGenerator()

    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = token_generator.make_token(user)

    return f"{frontend_url}/set-password?uid={uid}&token={token}"


def send_invite_email(user):
    """
    Sends an invite email with a set-password link:
    {FRONTEND_URL}/set-password?uid=<uid>&token=<token>
    """
    invite_link = generate_set_password_link(user)

    subject = "MFI System Invitation / Account Setup"
    message = (
        f"Hello {user.first_name or user.username},\n\n"
        "You have been invited to access the MFI system.\n"
        "Please click the link below to set your password and activate your account:\n\n"
        f"{invite_link}\n\n"
        "If you did not expect this invitation, you can ignore this email.\n\n"
        "Regards,\nMFI TEAM"
    )

    from_email = _build_from_email()

    send_mail(
        subject=subject,
        message=message,
        from_email=from_email,
        recipient_list=[user.email],
        fail_silently=False,
    )


def send_password_reset_email(user):
    """
    Sends a password reset email reusing the same set-password link generation.
    """
    reset_link = generate_set_password_link(user)

    subject = "MFI System Password Reset"
    message = (
        f"Hello {user.first_name or user.username},\n\n"
        "A password reset was requested for your MFI system account.\n"
        "Please click the link below to choose a new password:\n\n"
        f"{reset_link}\n\n"
        "If you did not request this reset, please contact your administrator immediately.\n\n"
        "Regards,\nMFI TEAM"
    )

    from_email = _build_from_email()

    send_mail(
        subject=subject,
        message=message,
        from_email=from_email,
        recipient_list=[user.email],
        fail_silently=False,
    )
