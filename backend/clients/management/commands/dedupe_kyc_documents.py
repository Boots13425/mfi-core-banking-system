from django.core.management.base import BaseCommand
from django.db.models import Count
from django.db import transaction

from clients.models import KYCDocument


class Command(BaseCommand):
    help = "Remove duplicate KYCDocument rows per (kyc, document_type). Keeps newest and deletes the rest + files."

    def handle(self, *args, **options):
        duplicates = (
            KYCDocument.objects
            .values("kyc_id", "document_type")
            .annotate(c=Count("id"))
            .filter(c__gt=1)
        )

        if not duplicates.exists():
            self.stdout.write(self.style.SUCCESS("No duplicates found."))
            return

        self.stdout.write(self.style.WARNING(f"Found {duplicates.count()} duplicate group(s). Cleaning..."))

        total_deleted_rows = 0
        total_deleted_files = 0

        with transaction.atomic():
            for group in duplicates:
                kyc_id = group["kyc_id"]
                doc_type = group["document_type"]

                # newest first
                docs = list(
                    KYCDocument.objects
                    .filter(kyc_id=kyc_id, document_type=doc_type)
                    .order_by("-created_at", "-id")
                )

                keep = docs[0]
                to_delete = docs[1:]

                self.stdout.write(f"- KYC={kyc_id} TYPE={doc_type}: keeping id={keep.id}, deleting {len(to_delete)}")

                for d in to_delete:
                    # delete stored file first (if exists)
                    try:
                        if d.file:
                            d.file.delete(save=False)
                            total_deleted_files += 1
                    except Exception:
                        pass

                    d.delete()
                    total_deleted_rows += 1

        self.stdout.write(self.style.SUCCESS(
            f"Done. Deleted {total_deleted_rows} duplicate row(s) and {total_deleted_files} file(s)."
        ))
