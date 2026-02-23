from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('loans', '0003_create_loandocumenttype'),
    ]

    operations = [
        # Add missing columns to loans_loanproductrequireddocument
        migrations.RunSQL(
            sql="""
            ALTER TABLE loans_loanproductrequireddocument
            ADD COLUMN IF NOT EXISTS product_id BIGINT,
            ADD COLUMN IF NOT EXISTS document_type_id BIGINT,
            ADD COLUMN IF NOT EXISTS is_mandatory BOOLEAN DEFAULT true;
            """,
            reverse_sql="""
            ALTER TABLE loans_loanproductrequireddocument
            DROP COLUMN IF EXISTS product_id,
            DROP COLUMN IF EXISTS document_type_id,
            DROP COLUMN IF EXISTS is_mandatory;
            """,
        ),
        # Add missing columns to loans_loandocument
        migrations.RunSQL(
            sql="""
            ALTER TABLE loans_loandocument
            ADD COLUMN IF NOT EXISTS loan_id BIGINT,
            ADD COLUMN IF NOT EXISTS document_type_id BIGINT,
            ADD COLUMN IF NOT EXISTS document_file VARCHAR(100),
            ADD COLUMN IF NOT EXISTS uploaded_by_id BIGINT,
            ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            ADD COLUMN IF NOT EXISTS label VARCHAR(200),
            ADD COLUMN IF NOT EXISTS description TEXT;
            """,
            reverse_sql="""
            ALTER TABLE loans_loandocument
            DROP COLUMN IF EXISTS loan_id,
            DROP COLUMN IF EXISTS document_type_id,
            DROP COLUMN IF EXISTS document_file,
            DROP COLUMN IF EXISTS uploaded_by_id,
            DROP COLUMN IF EXISTS uploaded_at,
            DROP COLUMN IF EXISTS label,
            DROP COLUMN IF EXISTS description;
            """,
        ),
        # Add missing columns to loans_loanschedule (RepaymentSchedule)
        migrations.RunSQL(
            sql="""
            ALTER TABLE loans_loanschedule
            ADD COLUMN IF NOT EXISTS loan_id BIGINT,
            ADD COLUMN IF NOT EXISTS month_number INTEGER,
            ADD COLUMN IF NOT EXISTS due_date DATE,
            ADD COLUMN IF NOT EXISTS principal_due NUMERIC(12, 2),
            ADD COLUMN IF NOT EXISTS interest_due NUMERIC(12, 2),
            ADD COLUMN IF NOT EXISTS penalty NUMERIC(12, 2) DEFAULT 0.00,
            ADD COLUMN IF NOT EXISTS principal_paid NUMERIC(12, 2) DEFAULT 0.00,
            ADD COLUMN IF NOT EXISTS interest_paid NUMERIC(12, 2) DEFAULT 0.00,
            ADD COLUMN IF NOT EXISTS penalty_paid NUMERIC(12, 2) DEFAULT 0.00,
            ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false;
            """,
            reverse_sql="""
            ALTER TABLE loans_loanschedule
            DROP COLUMN IF EXISTS loan_id,
            DROP COLUMN IF EXISTS month_number,
            DROP COLUMN IF EXISTS due_date,
            DROP COLUMN IF EXISTS principal_due,
            DROP COLUMN IF EXISTS interest_due,
            DROP COLUMN IF EXISTS penalty,
            DROP COLUMN IF EXISTS principal_paid,
            DROP COLUMN IF EXISTS interest_paid,
            DROP COLUMN IF EXISTS penalty_paid,
            DROP COLUMN IF EXISTS is_paid;
            """,
        ),
        # Add missing columns to loans_loanrepayment (RepaymentTransaction)
        migrations.RunSQL(
            sql="""
            ALTER TABLE loans_loanrepayment
            ADD COLUMN IF NOT EXISTS loan_id BIGINT,
            ADD COLUMN IF NOT EXISTS amount NUMERIC(12, 2),
            ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20),
            ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(200),
            ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            ADD COLUMN IF NOT EXISTS recorded_by_id BIGINT,
            ADD COLUMN IF NOT EXISTS notes TEXT;
            """,
            reverse_sql="""
            ALTER TABLE loans_loanrepayment
            DROP COLUMN IF EXISTS loan_id,
            DROP COLUMN IF EXISTS amount,
            DROP COLUMN IF EXISTS payment_method,
            DROP COLUMN IF EXISTS payment_reference,
            DROP COLUMN IF EXISTS paid_at,
            DROP COLUMN IF EXISTS recorded_by_id,
            DROP COLUMN IF EXISTS notes;
            """,
        ),
        # Add missing columns to loans_loanpenalty (PenaltyWaiver)
        migrations.RunSQL(
            sql="""
            ALTER TABLE loans_loanpenalty
            ADD COLUMN IF NOT EXISTS loan_id BIGINT,
            ADD COLUMN IF NOT EXISTS schedule_entry_id BIGINT,
            ADD COLUMN IF NOT EXISTS waived_amount NUMERIC(12, 2),
            ADD COLUMN IF NOT EXISTS waived_by_id BIGINT,
            ADD COLUMN IF NOT EXISTS waived_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            ADD COLUMN IF NOT EXISTS reason TEXT;
            """,
            reverse_sql="""
            ALTER TABLE loans_loanpenalty
            DROP COLUMN IF EXISTS loan_id,
            DROP COLUMN IF EXISTS schedule_entry_id,
            DROP COLUMN IF EXISTS waived_amount,
            DROP COLUMN IF EXISTS waived_by_id,
            DROP COLUMN IF EXISTS waived_at,
            DROP COLUMN IF EXISTS reason;
            """,
        ),
        # Add missing columns to loans_loandisbursal (Loan model fields)
        migrations.RunSQL(
            sql="""
            ALTER TABLE loans_loandisbursal
            ADD COLUMN IF NOT EXISTS client_id BIGINT,
            ADD COLUMN IF NOT EXISTS product_id BIGINT,
            ADD COLUMN IF NOT EXISTS branch_id BIGINT,
            ADD COLUMN IF NOT EXISTS amount NUMERIC(12, 2),
            ADD COLUMN IF NOT EXISTS interest_rate NUMERIC(5, 2) DEFAULT 0.00,
            ADD COLUMN IF NOT EXISTS tenure_months INTEGER,
            ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'DRAFT',
            ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE,
            ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
            ADD COLUMN IF NOT EXISTS disbursed_at TIMESTAMP WITH TIME ZONE,
            ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITH TIME ZONE,
            ADD COLUMN IF NOT EXISTS disbursement_method VARCHAR(20),
            ADD COLUMN IF NOT EXISTS disbursement_reference VARCHAR(200),
            ADD COLUMN IF NOT EXISTS loan_officer_id BIGINT,
            ADD COLUMN IF NOT EXISTS branch_manager_id BIGINT,
            ADD COLUMN IF NOT EXISTS bm_remarks TEXT;
            """,
            reverse_sql="""
            ALTER TABLE loans_loandisbursal
            DROP COLUMN IF EXISTS client_id,
            DROP COLUMN IF EXISTS product_id,
            DROP COLUMN IF EXISTS branch_id,
            DROP COLUMN IF EXISTS amount,
            DROP COLUMN IF EXISTS interest_rate,
            DROP COLUMN IF EXISTS tenure_months,
            DROP COLUMN IF EXISTS status,
            DROP COLUMN IF EXISTS created_at,
            DROP COLUMN IF EXISTS submitted_at,
            DROP COLUMN IF EXISTS approved_at,
            DROP COLUMN IF EXISTS disbursed_at,
            DROP COLUMN IF EXISTS closed_at,
            DROP COLUMN IF EXISTS disbursement_method,
            DROP COLUMN IF EXISTS disbursement_reference,
            DROP COLUMN IF EXISTS loan_officer_id,
            DROP COLUMN IF EXISTS branch_manager_id,
            DROP COLUMN IF EXISTS bm_remarks;
            """,
        ),
    ]
