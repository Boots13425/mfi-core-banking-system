from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from savings.models import SavingsProduct


class Command(BaseCommand):
    help = "Seed default savings products (idempotent)."

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write("Seeding savings products...")

        products = [
            {
                "code": "REG",
                "name": "Regular Savings",
                "min_opening_balance": Decimal("5000.00"),
                "min_balance": Decimal("5000.00"),
                "interest_rate": Decimal("3.00"),
                "withdrawal_requires_approval_above": Decimal("200000.00"),
            },
            {
                "code": "JNR",
                "name": "Junior Savings",
                "min_opening_balance": Decimal("2000.00"),
                "min_balance": Decimal("2000.00"),
                "interest_rate": Decimal("2.50"),
                "withdrawal_requires_approval_above": Decimal("100000.00"),
            },
            {
                "code": "TGT",
                "name": "Target Savings",
                "min_opening_balance": Decimal("10000.00"),
                "min_balance": Decimal("10000.00"),
                "interest_rate": Decimal("4.00"),
                "withdrawal_requires_approval_above": Decimal("500000.00"),
            },
            {
                "code": "FD",
                "name": "Fixed Deposit",
                "min_opening_balance": Decimal("100000.00"),
                "min_balance": Decimal("100000.00"),
                "interest_rate": Decimal("6.50"),
                "withdrawal_requires_approval_above": Decimal("0.00"),
            },
        ]

        fields = {f.name for f in SavingsProduct._meta.fields}
        for p in products:
            lookup = {"code": p["code"]}
            defaults = {k: v for k, v in p.items() if k in fields and k not in lookup}
            obj, created = SavingsProduct.objects.update_or_create(**lookup, defaults=defaults)
            action = "Created" if created else "Updated"
            self.stdout.write(f"  - {action} product {obj.code} / {obj.name}")

        self.stdout.write(self.style.SUCCESS("✓ Savings products seeded successfully"))
        self.stdout.write(f"  - Total products: {SavingsProduct.objects.count()}")

