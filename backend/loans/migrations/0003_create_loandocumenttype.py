from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('loans', '0002_alter_loan_amount_alter_loan_client_and_more'),
    ]

    operations = [
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
