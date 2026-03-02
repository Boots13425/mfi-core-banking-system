"""
Migration to add photo field to Client model.
"""

from django.db import migrations, models
import clients.models
import clients.validators


class Migration(migrations.Migration):

    dependencies = [
        ('clients', '0005_kycdocument_unique_kyc_document_type'),
    ]

    operations = [
        migrations.AddField(
            model_name='client',
            name='photo',
            field=models.ImageField(
                blank=True,
                help_text='Client photo (JPEG or PNG, max 5MB)',
                null=True,
                upload_to=clients.models.client_photo_upload_path,
                validators=[
                    clients.validators.validate_photo_format,
                    clients.validators.validate_photo_size,
                ]
            ),
        ),
    ]
