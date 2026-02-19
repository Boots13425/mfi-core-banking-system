import os
import sys
import django
import json

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mfi.settings')
django.setup()

from loans.models import Loan
from loans.serializers import LoanDetailSerializer

loan = Loan.objects.order_by('-created_at').first()
if not loan:
    print('No loans found')
else:
    serialized = LoanDetailSerializer(loan, context={'request': None}).data
    print(json.dumps(serialized, default=str, indent=2))
