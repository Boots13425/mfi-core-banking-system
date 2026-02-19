from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('loans', '0020_rename_legacy_tables'),
    ]

    operations = [
        # Drop old columns from legacy schema to align with current RepaymentSchedule model
        migrations.RunSQL(
            sql=(
                'ALTER TABLE "loans_repaymentschedule" '
                'DROP COLUMN IF EXISTS "schedule_number", '
                'DROP COLUMN IF EXISTS "principal", '
                'DROP COLUMN IF EXISTS "interest", '
                'DROP COLUMN IF EXISTS "total_due", '
                'DROP COLUMN IF EXISTS "paid_date", '
                'DROP COLUMN IF EXISTS "paid_amount", '
                'DROP COLUMN IF EXISTS "status", '
                'DROP COLUMN IF EXISTS "generated_at";'
            ),
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
