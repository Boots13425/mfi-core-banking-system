import os
import sys
import django
import decimal

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mfi.settings')
django.setup()

from loans.models import LoanProduct
from loans.serializers import LoanCreateUpdateSerializer, LoanDetailSerializer
from clients.models import Client
from accounts.models import User
from django.db import transaction

user = User.objects.filter(role='LOAN_OFFICER').first()
client = Client.objects.filter(status='ACTIVE').first()

if not user or not client:
    print('Missing test user or client')
    sys.exit(1)

for p in LoanProduct.objects.filter(active=True):
    data = {
        'client': client.id,
        'product': p.id,
        'amount': str(p.min_amount),
        'purpose': 'test create',
        # omit term_months to test fallback
    }
    print(f"Creating loan for product {p.name} (id={p.id})")
    serializer = LoanCreateUpdateSerializer(data=data)
    if not serializer.is_valid():
        print('Validation errors:', serializer.errors)
        continue
    try:
        save_kwargs = {
            'loan_officer': user,
            'branch': getattr(user, 'branch', None),
            'status': 'DRAFT',
            'interest_rate': p.interest_rate if p.interest_rate is not None else decimal.Decimal('0.00'),
        }
        if not serializer.validated_data.get('term_months'):
            save_kwargs['term_months'] = p.term_months
        loan = serializer.save(**save_kwargs)
        print('Created loan id', loan.id)
        print(LoanDetailSerializer(loan).data)
    except Exception as e:
        print('Exception during creation:', type(e), e)

print('Done')
