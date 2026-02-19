# Generated migration to remove duplicate loan_product_id column

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('loans', '0015_add_rejection_reason_field'),
    ]

    operations = [
        migrations.RunSQL(
            "ALTER TABLE loans_loan DROP COLUMN loan_product_id;",
            reverse_sql="ALTER TABLE loans_loan ADD COLUMN loan_product_id BIGINT NOT NULL DEFAULT 1;",
        ),
    ]
