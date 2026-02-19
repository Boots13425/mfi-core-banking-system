import os
import sys
import django

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mfi.settings')
django.setup()

from accounts.models import User
from clients.models import Client, KYC

los = User.objects.filter(role='LOAN_OFFICER')
bms = User.objects.filter(role='BRANCH_MANAGER')
cashiers = User.objects.filter(role='CASHIER')
clients = Client.objects.filter(status='ACTIVE')
kycs = KYC.objects.filter(status='APPROVED')

print(f"Loan Officers: {los.count()}")
print(f"Branch Managers: {bms.count()}")
print(f"Cashiers: {cashiers.count()}")
print(f"Active Clients: {clients.count()}")
print(f"Approved KYCs: {kycs.count()}")

if los:
    print(f"  LO: {los.first().username}, branch={los.first().branch}")
if bms:
    print(f"  BM: {bms.first().username}, branch={bms.first().branch}")
if cashiers:
    print(f"  Cashier: {cashiers.first().username}, branch={cashiers.first().branch}")
if clients:
    print(f"  Client: {clients.first().full_name}")
if kycs:
    print(f"  Client with KYC: {kycs.first().client.full_name}")
