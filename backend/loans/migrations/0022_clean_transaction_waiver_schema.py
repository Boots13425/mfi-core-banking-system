from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('loans', '0021_clean_repaymentschedule_schema'),
    ]

    operations = [
        # Clean RepaymentTransaction table schema
        migrations.RunSQL(
            sql=(
                'ALTER TABLE "loans_repaymenttransaction" '
                'DROP COLUMN IF EXISTS "role_at_time", '
                'DROP COLUMN IF EXISTS "penalty_paid", '
                'DROP COLUMN IF EXISTS "interest_paid", '
                'DROP COLUMN IF EXISTS "principal_paid", '
                'DROP COLUMN IF EXISTS "branch_id", '
                'DROP COLUMN IF EXISTS "posted_by_id", '
                'DROP COLUMN IF EXISTS "schedule_item_id";'
            ),
            reverse_sql=migrations.RunSQL.noop,
        ),
        # Clean PenaltyWaiver table schema
        migrations.RunSQL(
            sql=(
                'ALTER TABLE "loans_penaltywaiver" '
                'DROP COLUMN IF EXISTS "computed_penalty", '
                'DROP COLUMN IF EXISTS "waive_reason", '
                'DROP COLUMN IF EXISTS "schedule_item_id";'
            ),
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
