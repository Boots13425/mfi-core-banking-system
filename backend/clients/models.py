import uuid
import os
from django.db import models
from django.conf import settings


def kyc_document_upload_path(instance, filename):
    """Generate upload path for KYC documents"""
    # Sanitize client name for use in file path (replace spaces and special chars with underscores)
    client_name = ''.join(c if c.isalnum() or c in (' ', '-', '_') else '_' for c in instance.kyc.client.full_name)
    client_name = client_name.strip().replace(' ', '_')
    return f'kyc_documents/{instance.kyc.client.id}_{client_name}/{instance.document_type}/{filename}'


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
        ('PENDING', 'Pending'),  # KYC initiated but documents not yet uploaded
        ('SUBMITTED', 'Submitted'),  # Documents uploaded, awaiting review
        ('APPROVED', 'Approved'),  # KYC validated, client activated
        ('REJECTED', 'Rejected'),  # KYC rejected, needs resubmission
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

    def __str__(self):
        return f"{self.get_document_type_display()} for {self.kyc.client.full_name}"

    def filename(self):
        return os.path.basename(self.file.name)
