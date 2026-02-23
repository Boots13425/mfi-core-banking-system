# Migration to reset loans_loandocument table schema to match Django model
# Fixes migration drift: removes old document_type varchar column and recreates table properly

from django.db import migrations, models
import django.db.models.deletion
import loans.models


class Migration(migrations.Migration):

    dependencies = [
        ('loans', '0025_alter_loandocument_document_type_not_null'),
    ]

    operations = [
        # Drop the entire loans_loandocument table (with CASCADE for any FK dependencies)
        migrations.RunSQL(
            sql="DROP TABLE IF EXISTS loans_loandocument CASCADE;",
            reverse_sql="",
        ),
        
        # Recreate the table with proper schema matching Django model
        migrations.CreateModel(
            name='LoanDocument',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('document_file', models.FileField(upload_to=loans.models.loan_doc_upload_path)),
                ('uploaded_at', models.DateTimeField(auto_now_add=True)),
                ('label', models.CharField(blank=True, help_text='Label for other documents', max_length=200)),
                ('description', models.TextField(blank=True)),
                ('document_type', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to='loans.loandocumenttype')),
                ('loan', models.ForeignKey(on_delete=django.db.models.CASCADE, related_name='documents', to='loans.loan')),
                ('uploaded_by', models.ForeignKey(null=True, on_delete=django.db.models.SET_NULL, to='accounts.user')),
            ],
            options={
                'ordering': ['-uploaded_at'],
            },
        ),
        
        # Add indexes for common queries
        migrations.AddIndex(
            model_name='loandocument',
            index=models.Index(fields=['loan', '-uploaded_at'], name='loans_loand_loan_id_uploads_at_idx'),
        ),
        migrations.AddIndex(
            model_name='loandocument',
            index=models.Index(fields=['loan', 'document_type'], name='loans_loand_loan_id_doc_type_idx'),
        ),
    ]
