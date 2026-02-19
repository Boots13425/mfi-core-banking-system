from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("loans", "0013_alter_loan_purpose_nullable"),
    ]

    operations = [
        migrations.RunSQL(
            sql="ALTER TABLE loans_loan ALTER COLUMN bm_remarks SET DEFAULT '';",
            reverse_sql="ALTER TABLE loans_loan ALTER COLUMN bm_remarks DROP DEFAULT;",
        ),
        migrations.RunSQL(
            sql="UPDATE loans_loan SET bm_remarks = '' WHERE bm_remarks IS NULL;",
            reverse_sql=migrations.RunSQL.noop,
        ),
        migrations.RunSQL(
            sql="ALTER TABLE loans_loan ALTER COLUMN disbursement_reference SET DEFAULT '';",
            reverse_sql="ALTER TABLE loans_loan ALTER COLUMN disbursement_reference DROP DEFAULT;",
        ),
        migrations.RunSQL(
            sql="UPDATE loans_loan SET disbursement_reference = '' WHERE disbursement_reference IS NULL;",
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
