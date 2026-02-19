from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('loans', '0019_add_interest_rate_default'),
    ]

    operations = [
        migrations.RunSQL(
            sql=(
                'ALTER TABLE IF EXISTS "loans_loanschedule" RENAME TO "loans_repaymentschedule"; '
                'ALTER TABLE IF EXISTS "loans_loanrepayment" RENAME TO "loans_repaymenttransaction"; '
                'ALTER TABLE IF EXISTS "loans_loanpenalty" RENAME TO "loans_penaltywaiver"; '
            ),
            reverse_sql=(
                'ALTER TABLE IF EXISTS "loans_repaymentschedule" RENAME TO "loans_loanschedule"; '
                'ALTER TABLE IF EXISTS "loans_repaymenttransaction" RENAME TO "loans_loanrepayment"; '
                'ALTER TABLE IF EXISTS "loans_penaltywaiver" RENAME TO "loans_loanpenalty"; '
            ),
        ),
    ]
