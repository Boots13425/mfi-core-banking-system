from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("loans", "0009_add_disbursement_columns"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[],  # ✅ do NOT touch the DB
            state_operations=[
                migrations.RenameField(
                    model_name="loan",
                    old_name="tenure_months",
                    new_name="term_months",
                ),
            ],
        ),
    ]
