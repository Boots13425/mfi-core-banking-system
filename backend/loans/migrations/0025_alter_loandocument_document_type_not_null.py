# Migration to enforce NOT NULL on LoanDocument.document_type

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('loans', '0024_merge_20260220_1328'),
    ]

    operations = [
        migrations.AlterField(
            model_name='loandocument',
            name='document_type',
            field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to='loans.loandocumenttype'),
        ),
    ]
