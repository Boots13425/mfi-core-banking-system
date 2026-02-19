from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('loans', '0003_create_loandocumenttype'),
    ]

    operations = [
        # Add missing columns to loans_loanproduct
        migrations.RunSQL(
            sql="""
            ALTER TABLE loans_loanproduct
            ADD COLUMN IF NOT EXISTS product_type VARCHAR(20),
            ADD COLUMN IF NOT EXISTS description TEXT,
            ADD COLUMN IF NOT EXISTS min_amount NUMERIC(12, 2),
            ADD COLUMN IF NOT EXISTS max_amount NUMERIC(12, 2),
            ADD COLUMN IF NOT EXISTS interest_rate NUMERIC(5, 2),
            ADD COLUMN IF NOT EXISTS tenure_months INTEGER,
            ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true,
            ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
            """,
            reverse_sql="""
            ALTER TABLE loans_loanproduct
            DROP COLUMN IF EXISTS product_type,
            DROP COLUMN IF EXISTS description,
            DROP COLUMN IF EXISTS min_amount,
            DROP COLUMN IF EXISTS max_amount,
            DROP COLUMN IF EXISTS interest_rate,
            DROP COLUMN IF EXISTS tenure_months,
            DROP COLUMN IF EXISTS active,
            DROP COLUMN IF EXISTS created_at;
            """,
        ),
        # Add missing columns to loans_loandocumenttype
        migrations.RunSQL(
            sql="""
            ALTER TABLE loans_loandocumenttype
            ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
            """,
            reverse_sql="""
            ALTER TABLE loans_loandocumenttype
            DROP COLUMN IF EXISTS description;
            """,
        ),
    ]
