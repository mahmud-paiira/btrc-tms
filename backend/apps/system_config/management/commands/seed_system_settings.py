from django.core.management.base import BaseCommand
from apps.system_config.models import SystemSetting


DEFAULT_SETTINGS = [
    {'key': 'attendance_requirement', 'value': '80', 'data_type': 'integer', 'description': 'Minimum attendance percentage required for certification'},
    {'key': 'passing_marks', 'value': '80', 'data_type': 'integer', 'description': 'Minimum passing marks for assessments'},
    {'key': 'session_timeout_hours', 'value': '12', 'data_type': 'integer', 'description': 'User session timeout in hours'},
    {'key': 'password_min_length', 'value': '8', 'data_type': 'integer', 'description': 'Minimum password length'},
    {'key': 'password_require_uppercase', 'value': 'true', 'data_type': 'boolean', 'description': 'Password must contain uppercase letter'},
    {'key': 'password_require_lowercase', 'value': 'true', 'data_type': 'boolean', 'description': 'Password must contain lowercase letter'},
    {'key': 'password_require_number', 'value': 'true', 'data_type': 'boolean', 'description': 'Password must contain number'},
    {'key': 'password_require_special', 'value': 'true', 'data_type': 'boolean', 'description': 'Password must contain special character'},
    {'key': 'mfa_required', 'value': 'false', 'data_type': 'boolean', 'description': 'Require multi-factor authentication'},
    {'key': 'max_login_attempts', 'value': '5', 'data_type': 'integer', 'description': 'Maximum failed login attempts before lockout'},
    {'key': 'backup_enabled', 'value': 'true', 'data_type': 'boolean', 'description': 'Enable automatic backup'},
    {'key': 'backup_time', 'value': '02:00', 'data_type': 'string', 'description': 'Scheduled backup time (HH:MM)'},
]


class Command(BaseCommand):
    help = 'Seeds default system settings'

    def handle(self, *args, **options):
        created = 0
        for item in DEFAULT_SETTINGS:
            _, was_created = SystemSetting.objects.get_or_create(
                key=item['key'],
                defaults=item,
            )
            if was_created:
                created += 1
                self.stdout.write(f'  Created: {item["key"]} = {item["value"]}')
        self.stdout.write(self.style.SUCCESS(f'Done. {created} settings created.'))
