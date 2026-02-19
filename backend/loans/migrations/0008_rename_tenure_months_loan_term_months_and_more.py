import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('loans', '0007_alter_loan_product'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='loanproduct',
            name='tenure_months',
        ),
        migrations.AddField(
            model_name='loanproduct',
            name='term_months',
            field=models.IntegerField(
                default=12,
                help_text='Loan term in months',
                validators=[django.core.validators.MinValueValidator(1)]
            ),
            preserve_default=False,
        ),
    ]
