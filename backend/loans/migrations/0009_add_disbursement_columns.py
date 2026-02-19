from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('loans', '0008_rename_tenure_months_loan_term_months_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='loan',
            name='disbursement_method',
            field=models.CharField(
                max_length=20,
                choices=[
                    ('CASH', 'Cash'),
                    ('BANK_TRANSFER', 'Bank Transfer'),
                    ('SAVINGS_CREDIT', 'Savings Credit'),
                ],
                null=True,
                blank=True,
            ),
        ),
        migrations.AddField(
            model_name='loan',
            name='disbursement_reference',
            field=models.CharField(
                max_length=200,
                null=True,     # ✅ important
                blank=True,
            ),
        ),
    ]
