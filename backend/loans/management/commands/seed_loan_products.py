# backend/loans/management/commands/seed_loan_products.py

from decimal import Decimal
from django.core.management.base import BaseCommand
from django.db import transaction

from loans.models import LoanProduct, LoanProductRequiredDocument

# LoanDocumentType may or may not exist depending on your current schema
try:
    from loans.models import LoanDocumentType
except Exception:
    LoanDocumentType = None


class Command(BaseCommand):
    help = "Seed loan products and required documents (Cameroon context) safely across schema variants."

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write("Seeding loan products and documents...")

        # ---------------------------------------------------------------------
        # 1) Define Cameroon-context loan doc codes (LOAN ONLY, not KYC)
        # ---------------------------------------------------------------------
        # Use document type codes that match LoanDocumentType.DOCUMENT_TYPES
        # The first element of each pair is the code stored in the DB (and in the choices),
        # the second element is a human-friendly description used for `description`.
        DOCS = [
            ("PAYSLIP", "Latest 2–3 months payslips / salary statement"),
            ("EMPLOYER_ATTESTATION", "Employer attestation (attestation de travail)"),
            ("BANK_STATEMENT", "Bank statement (last 3 months)"),
            ("SALARY_DOMICILIATION", "Salary domiciliation / commitment letter (if applicable)"),
            ("BUSINESS_PROOF", "Proof of business activity (photos, receipts, lease, invoices)"),
            ("TRADE_REGISTER", "RCCM / patente / business registration proof (if available)"),
            ("CASHFLOW_SUMMARY", "Simple business cashflow summary (income/expenses)"),
            ("GUARANTOR_FORM", "Guarantor form / commitment"),
            ("EMERGENCY_JUSTIFICATION", "Emergency justification (hospital bill / school fees invoice / urgent quote)"),
            ("INCOME_PROOF", "Income proof (statement / payslip / cash-in history)"),
            ("FARM_PROOF", "Proof of farm activity (land/lease/photos/cooperative attestation)"),
            ("PROFORMA_INVOICE", "Inputs proforma invoice (seeds/fertilizer/tools)"),
            ("SEASONAL_PLAN", "Season plan / expected harvest cashflow"),
            ("OTHER_LOAN_DOCUMENT", "Other supporting document (free upload)"),
        ]

        # ---------------------------------------------------------------------
        # 2) Create LoanDocumentType records ONLY if your schema has that model
        #    (and DO NOT assume fields like is_active exist)
        # ---------------------------------------------------------------------
        doc_type_objects = {}  # code -> LoanDocumentType instance (if FK-based schema)

        if LoanDocumentType is not None:
            doc_fields = {f.name for f in LoanDocumentType._meta.get_fields()}

            # Pick a stable lookup field
            if "code" in doc_fields:
                lookup_field = "code"
            elif "name" in doc_fields:
                lookup_field = "name"
            else:
                lookup_field = None

            for code, label in DOCS:
                if lookup_field is None:
                    # Model exists but doesn't have code/name; we can't safely seed it.
                    break

                lookup = {lookup_field: code}

                defaults = {}
                # Ensure `name` is set (it's NOT NULL and uses choices); set it to the code
                if "name" in doc_fields:
                    defaults["name"] = code
                # Provide a description/label if the field exists
                if "description" in doc_fields:
                    defaults["description"] = label
                if "label" in doc_fields:
                    defaults["label"] = label
                if "title" in doc_fields:
                    defaults["title"] = label

                # Use get_or_create with explicit defaults that satisfy NOT NULL constraints
                obj, created = LoanDocumentType.objects.get_or_create(**lookup, defaults=defaults)

                # If object exists but fields are out of date, sync them
                changed = False
                if "description" in doc_fields and getattr(obj, "description", None) != label:
                    obj.description = label
                    changed = True
                if "label" in doc_fields and getattr(obj, "label", None) != label:
                    obj.label = label
                    changed = True
                if "title" in doc_fields and getattr(obj, "title", None) != label:
                    obj.title = label
                    changed = True
                # Ensure name stores the code (choices require this value)
                if "name" in doc_fields and getattr(obj, "name", None) != code:
                    obj.name = code
                    changed = True

                if changed:
                    obj.save()

                doc_type_objects[code] = obj

        # ---------------------------------------------------------------------
        # 3) Seed Loan Products (idempotent)
        # ---------------------------------------------------------------------
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

        product_fields = {f.name for f in LoanProduct._meta.get_fields()}

        product_map = {}
        for p in products:
            lookup = {}
            if "code" in product_fields:
                lookup = {"code": p["code"]}
            else:
                # fallback
                lookup = {"name": p["name"]}

            defaults = {k: v for k, v in p.items() if k in product_fields and k not in lookup}
            obj, _ = LoanProduct.objects.update_or_create(**lookup, defaults=defaults)
            product_map[p["code"]] = obj

        # ---------------------------------------------------------------------
        # 4) Required docs per product (Cameroon context)
        # ---------------------------------------------------------------------
        required = {
            "SL": [
                ("PAYSLIP_OR_SALARY_STATEMENT", True),
                ("EMPLOYER_ATTESTATION", True),
                ("BANK_STATEMENT", True),
                ("COMMITMENT_LETTER", False),
                ("OTHER_LOAN_DOCUMENT", False),
            ],
            "BL": [
                ("BUSINESS_ACTIVITY_PROOF", True),
                ("BUSINESS_LICENSE_OR_TRADE_REGISTER", True),
                ("BANK_STATEMENT", True),
                ("BUSINESS_CASHFLOW_SUMMARY", True),
                ("GUARANTOR_FORM", True),
                ("OTHER_LOAN_DOCUMENT", False),
            ],
            "EL": [
                ("EMERGENCY_JUSTIFICATION", True),
                ("INCOME_PROOF_LIGHT", True),
                ("GUARANTOR_FORM", True),
                ("OTHER_LOAN_DOCUMENT", False),
            ],
            "AL": [
                ("FARM_ACTIVITY_PROOF", True),
                ("INPUTS_PROFORMA_INVOICE", True),
                ("CASHFLOW_SEASON_PLAN", True),
                ("GUARANTOR_FORM", True),
                ("OTHER_LOAN_DOCUMENT", False),
            ],
        }

        req_fields = {f.name for f in LoanProductRequiredDocument._meta.get_fields()}

        # Determine FK field to product on required doc model
        if "loan_product" in req_fields:
            product_fk_field = "loan_product"
        elif "product" in req_fields:
            product_fk_field = "product"
        else:
            raise Exception("Cannot find loan product FK on LoanProductRequiredDocument (expected loan_product or product).")

        # Determine how document_type is stored (FK or CharField)
        doc_type_field = LoanProductRequiredDocument._meta.get_field("document_type")
        document_type_is_fk = getattr(doc_type_field, "is_relation", False)

        # Rebuild required docs cleanly per product
        for product_code, doc_list in required.items():
            product = product_map[product_code]

            # Only update documents if document_type field is properly configured
            try:
                LoanProductRequiredDocument.objects.filter(**{product_fk_field: product}).delete()

                for idx, (doc_code, mandatory) in enumerate(doc_list, start=1):
                    defaults = {}

                    # Optional metadata fields if present
                    if "description" in req_fields:
                        defaults["description"] = dict(DOCS).get(doc_code, doc_code)
                    if "is_mandatory" in req_fields:
                        defaults["is_mandatory"] = mandatory
                    if "is_required" in req_fields:
                        defaults["is_required"] = mandatory
                    if "order" in req_fields:
                        defaults["order"] = idx
                    if "display_order" in req_fields:
                        defaults["display_order"] = idx

                    lookup = {product_fk_field: product}

                    if document_type_is_fk:
                        if LoanDocumentType is None:
                            raise Exception("document_type is FK but LoanDocumentType model is not importable.")

                        if doc_code not in doc_type_objects:
                            # As a fallback, create doc type with minimal fields
                            doc_fields = {f.name for f in LoanDocumentType._meta.get_fields()}
                            if "code" in doc_fields:
                                dt_lookup = {"code": doc_code}
                            elif "name" in doc_fields:
                                dt_lookup = {"name": doc_code}
                            else:
                                raise Exception("LoanDocumentType has no code/name field for lookup.")

                            dt_defaults = {}
                            if "description" in doc_fields:
                                dt_defaults["description"] = dict(DOCS).get(doc_code, doc_code)

                            dt, _ = LoanDocumentType.objects.get_or_create(**dt_lookup, defaults=dt_defaults)
                            doc_type_objects[doc_code] = dt

                        lookup["document_type"] = doc_type_objects[doc_code]
                    else:
                        lookup["document_type"] = doc_code

                    LoanProductRequiredDocument.objects.update_or_create(**lookup, defaults=defaults)
            except Exception as doc_error:
                # If document linking fails, still succeed with product update
                self.stdout.write(
                    self.style.WARNING(f"  ! Could not seed document requirements for {product.name}: {str(doc_error)}")
                )

        self.stdout.write(self.style.SUCCESS("✓ Loan products seeded successfully!"))
        self.stdout.write(f"  - Products: {LoanProduct.objects.count()}")
        self.stdout.write(f"  - Required docs: {LoanProductRequiredDocument.objects.count()}")
