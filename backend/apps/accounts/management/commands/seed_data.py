from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.accounts.models import User
from apps.centers.models import Center
from apps.courses.models import Course


class Command(BaseCommand):
    help = 'Seed database with test data for development'

    def handle(self, *args, **options):
        self.stdout.write('Seeding data...')

        center, _ = Center.objects.get_or_create(
            code='DHAKA_TCU',
            defaults=dict(
                name_bn='ঢাকা প্রশিক্ষণ কেন্দ্র',
                name_en='Dhaka Training Center',
                address='১০৮, পুরানা পল্টন, ঢাকা-১০০০',
                phone='০২-৯৫১৩৯৪০',
                email='dhaka_tcu@brtc.gov.bd',
            ),
        )
        self.stdout.write(f'  ✓ Center: {center.name_bn}')

        course, _ = Course.objects.get_or_create(
            code='DRV-FND-MRN-001',
            defaults=dict(
                name_bn='ড্রাইভিং ফাউন্ডেশন (মর্নিং)',
                name_en='Driving Foundation (Morning)',
                course_type='driver',
                term='foundation',
                session='morning',
                duration_months=3,
                duration_hours=240,
                total_training_days=60,
                fee=15000,
                status='active',
            ),
        )
        self.stdout.write(f'  ✓ Course: {course.name_bn}')

        users_data = [
            dict(
                email='admin@brtc.gov.bd',
                password='admin123',
                user_type='head_office',
                full_name_bn='হেড অফিস প্রশাসক',
                full_name_en='Head Office Admin',
                phone='01700000001',
                nid='1234567890',
                is_staff=True,
                is_superuser=True,
            ),
            dict(
                email='center@brtc.gov.bd',
                password='center123',
                user_type='center_admin',
                full_name_bn='ঢাকা কেন্দ্র প্রশাসক',
                full_name_en='Dhaka Center Admin',
                phone='01700000002',
                nid='1234567891',
                center=center,
                is_staff=True,
            ),
            dict(
                email='trainer@brtc.gov.bd',
                password='trainer123',
                user_type='trainer',
                full_name_bn='প্রশিক্ষক রহিম',
                full_name_en='Trainer Rahim',
                phone='01700000003',
                nid='1234567892',
                center=center,
            ),
            dict(
                email='assessor@brtc.gov.bd',
                password='assessor123',
                user_type='assessor',
                full_name_bn='মূল্যায়নকারী করিম',
                full_name_en='Assessor Karim',
                phone='01700000004',
                nid='1234567893',
                center=center,
            ),
            dict(
                email='trainee@brtc.gov.bd',
                password='trainee123',
                user_type='trainee',
                full_name_bn='প্রশিক্ষণার্থী সুমন',
                full_name_en='Trainee Sumon',
                phone='01700000005',
                nid='1234567894',
                center=center,
            ),
        ]

        for data in users_data:
            password = data.pop('password')
            user, created = User.objects.get_or_create(
                email=data['email'],
                defaults=data,
            )
            user.set_password(password)
            user.save(update_fields=['password'])
            self.stdout.write(
                f'  {"✓" if created else "~"} User: {user.full_name_bn} ({user.email})'
            )

        self.stdout.write(self.style.SUCCESS('Seed complete. Logins:'))
        self.stdout.write('  ─────────────────────────────────────────────')
        self.stdout.write('  admin@brtc.gov.bd    / admin123    (Head Office)')
        self.stdout.write('  center@brtc.gov.bd   / center123   (Center Admin)')
        self.stdout.write('  trainer@brtc.gov.bd  / trainer123  (Trainer)')
        self.stdout.write('  assessor@brtc.gov.bd / assessor123 (Assessor)')
        self.stdout.write('  trainee@brtc.gov.bd  / trainee123  (Trainee)')
        self.stdout.write('  ─────────────────────────────────────────────')
