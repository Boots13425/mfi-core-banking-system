# Comprehensive migration to add all missing columns to Loan model

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('loans', '0005_add_junction_table_columns'),
    ]

    operations = [
        # Add product column if it doesn't exist
        migrations.AddField(
            model_name='loan',
            name='product',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.PROTECT, to='loans.loanproduct'),
            preserve_default=False,
        ),
    ]
