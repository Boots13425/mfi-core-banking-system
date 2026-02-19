from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("loans", "0012_add_missing_loan_officer_and_branch_manager_columns"),
    ]

    operations = [
        migrations.RunSQL(
            sql="ALTER TABLE loans_loan ALTER COLUMN purpose DROP NOT NULL;",
            reverse_sql="ALTER TABLE loans_loan ALTER COLUMN purpose SET NOT NULL;",
        ),
    ]
