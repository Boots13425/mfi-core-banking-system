from django.db import models
from django.contrib.auth.models import AbstractUser, UserManager
from django.contrib.auth.tokens import PasswordResetTokenGenerator

class CustomUserManager(UserManager):
    """Custom manager to set SUPER_ADMIN role for superusers"""
    def create_superuser(self, username, email=None, password=None, **extra_fields):
        extra_fields.setdefault('role', 'SUPER_ADMIN')
        return super().create_superuser(username, email, password, **extra_fields)

class Branch(models.Model):
    name = models.CharField(max_length=255, unique=True)
    code = models.CharField(max_length=50, unique=True)
    region = models.CharField(max_length=100)
    phone = models.CharField(max_length=20)
    address = models.TextField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.code})"

class User(AbstractUser):
    ROLE_CHOICES = [
        ('SUPER_ADMIN', 'Super Admin'),
        ('BRANCH_MANAGER', 'Branch Manager'),
        ('LOAN_OFFICER', 'Loan Officer'),
        ('CASHIER', 'Cashier'),
        ('AUDITOR', 'Auditor'),
        ('RECOVERY_OFFICER', 'Recovery Officer'),
    ]
    
    email = models.EmailField(unique=True)
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='CASHIER'
    )
    branch = models.ForeignKey(
        Branch,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='users'
    )
    
    objects = CustomUserManager()
    
    class Meta:
        ordering = ['-date_joined']
    
    def __str__(self):
        return f"{self.username} ({self.role})"

class AuditLog(models.Model):
    ACTION_CHOICES = [
        ('BRANCH_CREATED', 'Branch Created'),
        ('BRANCH_UPDATED', 'Branch Updated'),
        ('BRANCH_TOGGLED', 'Branch Toggled'),
        ('USER_INVITED', 'User Invited'),
        ('USER_UPDATED', 'User Updated'),
        ('USER_ACTIVATED', 'User Activated'),
        ('USER_DEACTIVATED', 'User Deactivated'),
        ('USER_ROLE_CHANGED', 'User Role Changed'),
        ('USER_BRANCH_CHANGED', 'User Branch Changed'),
        ('PASSWORD_SET_VIA_INVITE', 'Password Set Via Invite'),
        ('CLIENT_CREATED', 'Client Created'),
        ('CLIENT_STATUS_CHANGED', 'Client Status Changed'),
        ('KYC_INITIATED', 'KYC Initiated'),
        ('KYC_DOCUMENT_UPLOADED', 'KYC Document Uploaded'),
        ('KYC_APPROVED', 'KYC Approved'),
        ('KYC_REJECTED', 'KYC Rejected'),
        ('CLIENT_DEACTIVATED', 'Client Deactivated'),
        ('LOAN_CREATED', 'Loan Created'),
        ('REPAYMENT_RECORDED', 'Repayment Recorded'),
        ('LOAN_CLOSED', 'Loan Closed'),
        ('SAVINGS_ACCOUNT_CREATED', 'Savings Account Created'),
        ('SAVINGS_DEPOSIT_POSTED', 'Savings Deposit Posted'),
        ('SAVINGS_WITHDRAWAL_POSTED', 'Savings Withdrawal Posted'),
        ('SAVINGS_WITHDRAWAL_REQUESTED', 'Savings Withdrawal Requested'),
        ('SAVINGS_WITHDRAWAL_APPROVED', 'Savings Withdrawal Approved'),
        ('SAVINGS_WITHDRAWAL_REJECTED', 'Savings Withdrawal Rejected'),
        ('SAVINGS_ACCOUNT_FROZEN', 'Savings Account Frozen'),
        ('SAVINGS_ACCOUNT_CLOSED', 'Savings Account Closed'),
    ]
    
    actor = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs_as_actor'
    )
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    target_type = models.CharField(max_length=50)
    target_id = models.CharField(max_length=50)
    summary = models.TextField()
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.action} by {self.actor} on {self.created_at}"