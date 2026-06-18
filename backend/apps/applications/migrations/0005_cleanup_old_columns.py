from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('applications', '0004_application_master_data_fields'),
    ]

    operations = [
        migrations.RunSQL(
            sql=[
                'ALTER TABLE applications_application DROP COLUMN IF EXISTS account_number CASCADE',
                'ALTER TABLE applications_application DROP COLUMN IF EXISTS account_type CASCADE',
                'ALTER TABLE applications_application DROP COLUMN IF EXISTS additional_remarks CASCADE',
                'ALTER TABLE applications_application DROP COLUMN IF EXISTS alt_mobile CASCADE',
                'ALTER TABLE applications_application DROP COLUMN IF EXISTS bank_name CASCADE',
                'ALTER TABLE applications_application DROP COLUMN IF EXISTS ethnic_group CASCADE',
                'ALTER TABLE applications_application DROP COLUMN IF EXISTS father_education CASCADE',
                'ALTER TABLE applications_application DROP COLUMN IF EXISTS father_occupation CASCADE',
                'ALTER TABLE applications_application DROP COLUMN IF EXISTS home_district CASCADE',
                'ALTER TABLE applications_application DROP COLUMN IF EXISTS home_upazilla CASCADE',
                'ALTER TABLE applications_application DROP COLUMN IF EXISTS mother_education CASCADE',
                'ALTER TABLE applications_application DROP COLUMN IF EXISTS mother_occupation CASCADE',
                'ALTER TABLE applications_application DROP COLUMN IF EXISTS nid_number CASCADE',
                'ALTER TABLE applications_application DROP COLUMN IF EXISTS permanent_post_code CASCADE',
                'ALTER TABLE applications_application DROP COLUMN IF EXISTS permanent_upazilla CASCADE',
                'ALTER TABLE applications_application DROP COLUMN IF EXISTS preferred_course CASCADE',
                'ALTER TABLE applications_application DROP COLUMN IF EXISTS preferred_sector CASCADE',
                'ALTER TABLE applications_application DROP COLUMN IF EXISTS present_post_code CASCADE',
                'ALTER TABLE applications_application DROP COLUMN IF EXISTS present_upazilla CASCADE',
                'ALTER TABLE applications_application DROP COLUMN IF EXISTS professional_skills CASCADE',
                'ALTER TABLE applications_application DROP COLUMN IF EXISTS religion CASCADE',
                'ALTER TABLE applications_application DROP COLUMN IF EXISTS blood_group CASCADE',
                'ALTER TABLE applications_application DROP COLUMN IF EXISTS current_occupation CASCADE',
                'ALTER TABLE applications_application DROP COLUMN IF EXISTS license_number CASCADE',
                'ALTER TABLE applications_application DROP COLUMN IF EXISTS applied_batch_id CASCADE',
                'ALTER TABLE applications_application DROP COLUMN IF EXISTS center_id CASCADE',
                'ALTER TABLE applications_application DROP COLUMN IF EXISTS dob_day CASCADE',
                'ALTER TABLE applications_application DROP COLUMN IF EXISTS dob_month CASCADE',
                'ALTER TABLE applications_application DROP COLUMN IF EXISTS dob_year CASCADE',
                'ALTER TABLE applications_application DROP COLUMN IF EXISTS family_annual_income CASCADE',
                'ALTER TABLE applications_application DROP COLUMN IF EXISTS family_owns_home CASCADE',
                'ALTER TABLE applications_application DROP COLUMN IF EXISTS family_owns_land CASCADE',
                'ALTER TABLE applications_application DROP COLUMN IF EXISTS is_employed CASCADE',
                'ALTER TABLE applications_application DROP COLUMN IF EXISTS is_physically_challenged CASCADE',
                'ALTER TABLE applications_application DROP COLUMN IF EXISTS monthly_income CASCADE',
                'ALTER TABLE applications_application DROP COLUMN IF EXISTS num_siblings CASCADE',
                'ALTER TABLE applications_application DROP COLUMN IF EXISTS passing_year CASCADE',
                'ALTER TABLE applications_application DROP COLUMN IF EXISTS years_experience CASCADE',
                'ALTER TABLE applications_application DROP COLUMN IF EXISTS driving_experience CASCADE',
                'ALTER TABLE applications_application DROP COLUMN IF EXISTS has_driving_license CASCADE',
                'ALTER TABLE applications_application DROP COLUMN IF EXISTS previous_driving_training CASCADE',
            ],
            reverse_sql=[
                'SELECT 1',
            ],
            state_operations=[],
        ),
    ]
