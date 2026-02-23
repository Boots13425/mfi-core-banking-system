# backend/loans/management/commands/seed_loan_products.py

from decimal import Decimal
from django.core.management.base import BaseCommand
from django.db import transaction

from loans.models import LoanProduct, LoanProductRequiredDocument, LoanDocumentType


class Command(BaseCommand):
    help = "Seed loan products and required documents (Cameroon context)."

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write("Seeding loan products and documents...")

        # ------------------------------------------------------------
        # 1) Canonical Loan Document Types (CODES MUST MATCH EVERYWHERE)
        # ------------------------------------------------------------
        DOCS = [
            ("PAYSLIP", "Latest 2–3 months payslips / salary statement"),
            ("EMPLOYER_ATTESTATION", "Employer attestation (attestation de travail)"),
            ("BANK_STATEMENT", "Bank statement (last 3 months)"),
            ("SALARY_DOMICILIATION", "Salary domiciliation / commitment letter"),
            ("BUSINESS_PROOF", "Proof of business activity (photos, receipts, lease, invoices)"),
            ("TRADE_REGISTER", "RCCM / patente / business registration proof"),
            ("CASHFLOW_SUMMARY", "Business cashflow summary (income/expenses)"),
            ("GUARANTOR_FORM", "Guarantor form / commitment"),
            ("EMERGENCY_JUSTIFICATION", "Emergency justification (hospital bill / school fees invoice / urgent quote)"),
            ("INCOME_PROOF", "Income proof (statement / payslip / cash-in history)"),
            ("FARM_PROOF", "Proof of farm activity (land/lease/photos/cooperative attestation)"),
            ("PROFORMA_INVOICE", "Inputs proforma invoice (seeds/fertilizer/tools)"),
            ("SEASONAL_PLAN", "Season plan / expected harvest cashflow"),
            ("OTHER_LOAN_DOCUMENT", "Other supporting document (free upload)"),
        ]
        docs_map = dict(DOCS)

        # ------------------------------------------------------------
        # 2) Ensure LoanDocumentType rows exist for all DOCS
        #    (Your model uses choices on `name`, so store the CODE in name.)
        # ------------------------------------------------------------
        doc_fields = {f.name for f in LoanDocumentType._meta.fields}
        has_description = "description" in doc_fields
        has_code = "code" in doc_fields  # just in case your model has it

        doc_type_objects = {}  # code -> LoanDocumentType instance
        for code, label in DOCS:
            lookup = {"code": code} if has_code else {"name": code}
            defaults = {}
            if not has_code:
                defaults["name"] = code
            if has_description:
                defaults["description"] = label

            obj, _ = LoanDocumentType.objects.get_or_create(**lookup, defaults=defaults)

            # Keep description updated if field exists
            if has_description and obj.description != label:
                obj.description = label
                obj.save(update_fields=["description"])

            # If your model has both code + name, keep both aligned
            if has_code and getattr(obj, "name", None) != code and "name" in doc_fields:
                obj.name = code
                obj.save(update_fields=["name"])

            doc_type_objects[code] = obj

        # ------------------------------------------------------------
        # 3) Loan Products (idempotent)
        # ------------------------------------------------------------
        products = [
            {
                "code": "SL",
                "name": "Salary Loan",
                "description": "Short-term loans for salaried employees (Cameroon context).",
                "product_type": "SALARY",
                "term_months": 24,
                "interest_rate": Decimal("5.00"),
                "min_amount": Decimal("100000"),
                "max_amount": Decimal("5000000"),
            },
            {
                "code": "BL",
                "name": "Business Loan",
                "description": "Loans for business owners / SMEs (Cameroon context).",
                "product_type": "BUSINESS",
                "term_months": 36,
                "interest_rate": Decimal("7.50"),
                "min_amount": Decimal("500000"),
                "max_amount": Decimal("10000000"),
            },
            {
                "code": "EL",
                "name": "Emergency Loan",
                "description": "Quick emergency loans (medical, school fees, urgent needs).",
                "product_type": "EMERGENCY",
                "term_months": 6,
                "interest_rate": Decimal("10.00"),
                "min_amount": Decimal("50000"),
                "max_amount": Decimal("1000000"),
            },
            {
                "code": "AL",
                "name": "Agriculture Loan",
                "description": "Seasonal agriculture loans (inputs, seeds, fertilizer, tools).",
                "product_type": "AGRICULTURE",
                "term_months": 12,
                "interest_rate": Decimal("6.00"),
                "min_amount": Decimal("200000"),
                "max_amount": Decimal("3000000"),
            },
        ]

        product_fields = {f.name for f in LoanProduct._meta.fields}
        product_map = {}
        for p in products:
            lookup = {"code": p["code"]} if "code" in product_fields else {"name": p["name"]}
            defaults = {k: v for k, v in p.items() if k in product_fields and k not in lookup}
            obj, _ = LoanProduct.objects.update_or_create(**lookup, defaults=defaults)
            product_map[p["code"]] = obj

        # ------------------------------------------------------------
        # 4) Required docs per product (ONLY USE DOCS CODES ABOVE)
        # ------------------------------------------------------------
        required = {
            "SL": [
                ("PAYSLIP", True),
                ("EMPLOYER_ATTESTATION", True),
                ("BANK_STATEMENT", True),
                ("SALARY_DOMICILIATION", False),
                ("OTHER_LOAN_DOCUMENT", False),
            ],
            "BL": [
                ("BUSINESS_PROOF", True),
                ("TRADE_REGISTER", True),
                ("BANK_STATEMENT", True),
                ("CASHFLOW_SUMMARY", True),
                ("GUARANTOR_FORM", True),
                ("OTHER_LOAN_DOCUMENT", False),
            ],
            "EL": [
                ("EMERGENCY_JUSTIFICATION", True),
                ("INCOME_PROOF", True),
                ("GUARANTOR_FORM", True),
                ("OTHER_LOAN_DOCUMENT", False),
            ],
            "AL": [
                ("FARM_PROOF", True),
                ("PROFORMA_INVOICE", True),
                ("SEASONAL_PLAN", True),
                ("GUARANTOR_FORM", True),
                ("OTHER_LOAN_DOCUMENT", False),
            ],
        }

        # Rebuild required docs per product using FK-based schema
        for product_code, doc_list in required.items():
            product = product_map[product_code]

            # Clean existing requirements for this product
            LoanProductRequiredDocument.objects.filter(product=product).delete()

            for doc_code, mandatory in doc_list:
                doc_type = doc_type_objects.get(doc_code)
                if not doc_type:
                    raise Exception(f"Missing LoanDocumentType for code={doc_code}")

                # Create or update using FK fields only
                LoanProductRequiredDocument.objects.update_or_create(
                    product=product,
                    document_type=doc_type,
                    defaults={"is_mandatory": mandatory}
                )

        self.stdout.write(self.style.SUCCESS("✓ Loan products seeded successfully!"))
        self.stdout.write(f"  - Products: {LoanProduct.objects.count()}")
        self.stdout.write(f"  - Required docs: {LoanProductRequiredDocument.objects.count()}")