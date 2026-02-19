#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mfi.settings')
django.setup()

from django.contrib.auth import get_user_model
from clients.models import Client, KYC

User = get_user_model()

print("=== LOAN OFFICERS ===")
pos = User.objects.filter(role='LOAN_OFFICER')
for u in pos:
    print(f"LO: {u.username}, branch={u.branch}, branch_id={getattr(u, 'branch_id', 'N/A')}")

print("\n=== ACTIVE CLIENTS ===")
for c in Client.objects.filter(status='ACTIVE'):
    try:
        kyc = c.kyc
        print(f"Client: {c.full_name}, branch={c.branch}, KYC={kyc.status}")
    except:
        print(f"Client: {c.full_name}, branch={c.branch}, KYC=None")
