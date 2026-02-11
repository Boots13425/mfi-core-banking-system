import uuid
import os
import re
from django.db import models
from django.conf import settings


def safe_folder_name(value: str) -> str:
    """
    Convert a client name to a filesystem-safe folder name.
    - trims
    - spaces -> underscores
    - removes special characters
    - limits length to avoid very long paths
    """
    value = (value or "").strip()
    value = re.sub(r"\s+", "_", value)                 # spaces -> _
    value = re.sub(r"[^A-Za-z0-9_\-]", "", value)      # keep only safe chars
    return value[:60] or "unknown"


def kyc_document_upload_path(instance, filename):
    """Generate upload path for KYC documents"""
    client = instance.kyc.client
    client_folder = f"{client.id}_{safe_folder_name(client.full_name)}"
    return f"kyc_documents/{client_folder}/{instance.document_type}/{filename}"


class Client(models.Model):
    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('INACTIVE', 'Inactive'),
    ]

    client_number = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    full_name = models.CharField(max_length=255)
    national_id = models.CharField(max_length=100, null=True, blank=True)
    phone = models.CharField(max_length=50, null=True, blank=True)
    email = models.EmailField(null=True, blank=True)
    address = models.TextField(null=True, blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='INACTIVE')
    branch = models.ForeignKey(
        'accounts.Branch', on_delete=models.SET_NULL, null=True, blank=True, related_name='clients'
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='clients_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.full_name} ({self.client_number})"


class KYC(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),      # KYC initiated but documents not yet uploaded
        ('SUBMITTED', 'Submitted'),  # Documents uploaded, awaiting review
        ('APPROVED', 'Approved'),    # KYC validated, client activated
        ('REJECTED', 'Rejected'),    # KYC rejected, needs resubmission
    ]

    client = models.OneToOneField(
        Client,
        on_delete=models.CASCADE,
        related_name='kyc'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='PENDING'
    )
    initiated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='kycs_initiated'
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='kycs_reviewed'
    )
    rejection_reason = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"KYC for {self.client.full_name} - {self.status}"


class KYCDocument(models.Model):
    DOCUMENT_TYPE_CHOICES = [
        ('NATIONAL_ID', 'National ID'),
        ('PROOF_OF_ADDRESS', 'Proof of Address'),
        ('PHOTO', 'Client Photo'),
        ('OTHER', 'Other Document'),
    ]

    kyc = models.ForeignKey(
        KYC,
        on_delete=models.CASCADE,
        related_name='documents'
    )
    document_type = models.CharField(
        max_length=50,
        choices=DOCUMENT_TYPE_CHOICES
    )
    file = models.FileField(upload_to=kyc_document_upload_path)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='kyc_documents_uploaded'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['kyc', 'document_type'],
                name='unique_kyc_document_type'
            )
        ]

    def __str__(self):
        return f"{self.get_document_type_display()} for {self.kyc.client.full_name}"

    def filename(self):
        return os.path.basename(self.file.name)

    def save(self, *args, **kwargs):
        """
        If the same KYCDocument row is updated with a new file, delete the old file first.
        This prevents multiple copies from being kept in storage.
        """
        if self.pk:
            old = KYCDocument.objects.filter(pk=self.pk).only("file").first()
            if old and old.file and self.file and old.file.name != self.file.name:
                old.file.delete(save=False)
        super().save(*args, **kwargs)
