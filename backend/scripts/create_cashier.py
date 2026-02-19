import os
import sys
import django

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mfi.settings')
django.setup()

from accounts.models import User, Branch

# Create cashier user if not exists
branch = Branch.objects.first()
cashier, created = User.objects.get_or_create(
    username='cashier_test',
    defaults={
        'email': 'cashier@test.local',
        'role': 'CASHIER',
        'branch': branch,
        'is_active': True,
    }
)
if created:
    cashier.set_password('test123')
    cashier.save()
    print(f"Created cashier: {cashier.username}")
else:
    print(f"Cashier already exists: {cashier.username}")
