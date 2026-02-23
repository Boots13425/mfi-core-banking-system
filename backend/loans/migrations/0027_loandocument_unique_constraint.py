# Migration to add unique_together constraint on LoanDocument

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('loans', '0026_reset_loandocument_schema'),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name='loandocument',
            unique_together={('loan', 'document_type')},
        ),
    ]
