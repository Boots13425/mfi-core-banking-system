# Migration to add default constraint for interest_rate column

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('loans', '0018_alter_loan_rejection_reason'),
    ]

    operations = [
        migrations.RunSQL(
            sql="ALTER TABLE loans_loan ALTER COLUMN interest_rate SET DEFAULT 0.00;",
            reverse_sql="ALTER TABLE loans_loan ALTER COLUMN interest_rate DROP DEFAULT;",
        ),
    ]
