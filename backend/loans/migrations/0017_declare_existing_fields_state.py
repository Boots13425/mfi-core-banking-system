# Migration to align Django model state with existing database columns
# The columns already exist in the database, we just need Django to recognize them

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('loans', '0016_remove_duplicate_loan_product_id_column'),
    ]

    operations = [
        # These operations only update Django's state, not the database
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                migrations.AddField(
                    model_name='loan',
                    name='purpose',
                    field=models.TextField(blank=True, null=True, help_text='Purpose of the loan'),
                ),
                migrations.AddField(
                    model_name='loan',
                    name='rejection_reason',
                    field=models.TextField(blank=True, default=''),
                ),
                migrations.AlterField(
                    model_name='loan',
                    name='bm_remarks',
                    field=models.TextField(blank=True, default='', help_text='Branch manager remarks for changes requested'),
                ),
                migrations.AlterField(
                    model_name='loan',
                    name='disbursement_reference',
                    field=models.CharField(blank=True, default='', max_length=200, help_text='Disbursement reference number'),
                ),
            ]
        ),
    ]
