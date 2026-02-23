from django.db import migrations
import django.core.validators
import django.db.models.deletion
from decimal import Decimal
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('clients', '0005_kycdocument_unique_kyc_document_type'),
        ('loans', '0002_rename_loans_loan_client__a4c8ee_idx_loans_loan_client__a27993_idx_and_more'),
    ]

    operations = [
        # Alter existing fields (from old 0002_alter)
        migrations.AlterField(
            model_name='loan',
            name='amount',
            field=models.DecimalField(decimal_places=2, max_digits=12, validators=[django.core.validators.MinValueValidator(Decimal('0.01'))]),
        ),
        migrations.AlterField(
            model_name='loan',
            name='client',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='loans', to='clients.client'),
        ),
        migrations.AlterField(
            model_name='loanproduct',
            name='max_amount',
            field=models.DecimalField(decimal_places=2, max_digits=12, validators=[django.core.validators.MinValueValidator(Decimal('0.01'))]),
        ),
        migrations.AlterField(
            model_name='loanproduct',
            name='min_amount',
            field=models.DecimalField(decimal_places=2, max_digits=12, validators=[django.core.validators.MinValueValidator(Decimal('0.01'))]),
        ),
        # Create LoanDocumentType table (from old 0003_create)
        migrations.RunSQL(
            sql="""
            CREATE TABLE IF NOT EXISTS loans_loandocumenttype (
                id BIGSERIAL PRIMARY KEY,
                code VARCHAR(50) NOT NULL UNIQUE,
                name VARCHAR(150) NOT NULL,
                description TEXT NOT NULL
            );
            """,
            reverse_sql="""
            DROP TABLE IF EXISTS loans_loandocumenttype;
            """,
        )
    ]
