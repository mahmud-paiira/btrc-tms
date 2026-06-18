from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('applications', '0005_cleanup_old_columns'),
    ]

    operations = [
        migrations.RunSQL(
            sql=[
                'ALTER TABLE applications_application DROP COLUMN IF EXISTS education_level CASCADE',
                'ALTER TABLE applications_application DROP COLUMN IF EXISTS gender CASCADE',
                'ALTER TABLE applications_application DROP COLUMN IF EXISTS present_district CASCADE',
                'ALTER TABLE applications_application DROP COLUMN IF EXISTS permanent_district CASCADE',
            ],
            reverse_sql=['SELECT 1'],
            state_operations=[],
        ),
    ]
