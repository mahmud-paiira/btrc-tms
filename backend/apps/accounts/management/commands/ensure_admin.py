from django.core.management.base import BaseCommand
from apps.accounts.models import User


class Command(BaseCommand):
    help = 'Ensure the HO admin superuser exists. Safe to run repeatedly (get_or_create).'

    def add_arguments(self, parser):
        parser.add_argument('--email', default='admin@brtc.gov.bd', help='Admin email')
        parser.add_argument('--password', default='admin123', help='Admin password')
        parser.add_argument('--phone', default='01700000000', help='Admin phone')

    def handle(self, *args, **options):
        email = options['email']
        password = options['password']
        phone = options['phone']

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'full_name_en': 'Head Office Admin',
                'full_name_bn': 'হেড অফিস এডমিন',
                'phone': phone,
                'user_type': 'head_office',
                'is_staff': True,
                'is_superuser': True,
                'is_active': True,
            },
        )

        if created:
            user.set_password(password)
            user.save()
            self.stdout.write(self.style.SUCCESS(
                f'Created admin user: {email} / {password}'
            ))
        else:
            if not user.is_superuser:
                user.is_superuser = True
                user.is_staff = True
                user.is_active = True
                user.user_type = 'head_office'
                user.save()
                self.stdout.write(self.style.WARNING(
                    f'User {email} existed but was not superuser — fixed.'
                ))
            else:
                self.stdout.write(self.style.SUCCESS(
                    f'Admin user {email} already exists. No changes.'
                ))
