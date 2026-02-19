from django.conf import settings
from django.db import migrations


def add_missing_columns(apps, schema_editor):
    Loan = apps.get_model("loans", "Loan")
    loan_table = Loan._meta.db_table

    # Resolve AUTH_USER_MODEL table safely (works even if you use a custom User model)
    user_app_label, user_model_name = settings.AUTH_USER_MODEL.split(".")
    User = apps.get_model(user_app_label, user_model_name)
    user_table = User._meta.db_table

    # Helper: check if a column exists
    with schema_editor.connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = %s
            """,
            [loan_table.split(".")[-1]],
        )
        existing_cols = {row[0] for row in cursor.fetchall()}

    statements = []

    # 1) Add loan_officer_id column if missing
    if "loan_officer_id" not in existing_cols:
        statements.append(f'ALTER TABLE "{loan_table}" ADD COLUMN "loan_officer_id" bigint NULL;')

    # 2) Add branch_manager_id column if missing
    if "branch_manager_id" not in existing_cols:
        statements.append(f'ALTER TABLE "{loan_table}" ADD COLUMN "branch_manager_id" bigint NULL;')

    # Execute ALTERs first
    for sql in statements:
        schema_editor.execute(sql)

    # 3) Backfill loan_officer_id from created_by_id if that exists
    if "created_by_id" in existing_cols:
        schema_editor.execute(
            f'''
            UPDATE "{loan_table}"
            SET "loan_officer_id" = "created_by_id"
            WHERE "loan_officer_id" IS NULL AND "created_by_id" IS NOT NULL;
            '''
        )

    # 4) Add FK constraints (only if columns exist now)
    # We guard with try/except because some DBs already have constraints or naming conflicts.
    try:
        schema_editor.execute(
            f'''
            ALTER TABLE "{loan_table}"
            ADD CONSTRAINT "loans_loan_loan_officer_id_fk"
            FOREIGN KEY ("loan_officer_id") REFERENCES "{user_table}"("id")
            DEFERRABLE INITIALLY DEFERRED;
            '''
        )
    except Exception:
        pass

    try:
        schema_editor.execute(
            f'''
            ALTER TABLE "{loan_table}"
            ADD CONSTRAINT "loans_loan_branch_manager_id_fk"
            FOREIGN KEY ("branch_manager_id") REFERENCES "{user_table}"("id")
            DEFERRABLE INITIALLY DEFERRED;
            '''
        )
    except Exception:
        pass


def remove_columns(apps, schema_editor):
    Loan = apps.get_model("loans", "Loan")
    loan_table = Loan._meta.db_table

    # Drop constraints + columns if rolling back
    for c in ["loans_loan_loan_officer_id_fk", "loans_loan_branch_manager_id_fk"]:
        try:
            schema_editor.execute(f'ALTER TABLE "{loan_table}" DROP CONSTRAINT "{c}";')
        except Exception:
            pass

    for col in ["loan_officer_id", "branch_manager_id"]:
        try:
            schema_editor.execute(f'ALTER TABLE "{loan_table}" DROP COLUMN "{col}";')
        except Exception:
            pass


class Migration(migrations.Migration):

    dependencies = [
        ("loans", "0011_alter_loan_loan_officer"),
    ]

    operations = [
        migrations.RunPython(add_missing_columns, reverse_code=remove_columns),
    ]
