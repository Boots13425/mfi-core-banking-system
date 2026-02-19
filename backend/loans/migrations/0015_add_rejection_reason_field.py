from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("loans", "0014_add_default_values_to_not_null_fields"),
    ]

    operations = [
        migrations.RunSQL(
            sql="ALTER TABLE loans_loan ALTER COLUMN rejection_reason SET DEFAULT '';",
            reverse_sql="ALTER TABLE loans_loan ALTER COLUMN rejection_reason DROP DEFAULT;",
        ),
        migrations.RunSQL(
            sql="UPDATE loans_loan SET rejection_reason = '' WHERE rejection_reason IS NULL;",
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
