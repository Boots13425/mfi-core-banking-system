# Generated migration to reset LoanProductRequiredDocument schema to match Django model

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('loans', '0022_clean_transaction_waiver_schema'),
    ]

    operations = [
        # Drop the misaligned table to reset it
        migrations.RunSQL(
            sql="DROP TABLE IF EXISTS loans_loanproductrequireddocument CASCADE;",
            reverse_sql="",
            state_operations=[
                migrations.DeleteModel(
                    name='LoanProductRequiredDocument',
                ),
            ]
        ),
        
        # Recreate with correct schema: product FK, document_type FK, is_mandatory bool, unique_together
        migrations.CreateModel(
            name='LoanProductRequiredDocument',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('is_mandatory', models.BooleanField(default=True)),
                ('document_type', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='loans.loandocumenttype')),
                ('product', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='required_documents', to='loans.loanproduct')),
            ],
            options={
                'unique_together': {('product', 'document_type')},
            },
        ),
    ]
