from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.accounts.models import User
from apps.centers.models import Center
from apps.trainers.models import Trainer, TrainerMapping
from apps.assessors.models import Assessor, AssessorMapping, TrainerAssessorLink
from apps.courses.models import Course


class Command(BaseCommand):
    help = 'Remove all existing trainers/assessors and seed 2 of each per center'

    def handle(self, *args, **options):
        self._delete_existing()
        self._seed()

    def get_centers(self):
        centers = Center.objects.filter(status='active').order_by('code')
        if not centers.exists():
            centers = Center.objects.all().order_by('code')
        return centers

    def get_courses(self):
        courses = Course.objects.all()[:2]
        return courses

    def _delete_existing(self):
        self.stdout.write('Deleting existing data...')

        t_links = TrainerAssessorLink.objects.count()
        TrainerAssessorLink.objects.all().delete()
        self.stdout.write(f'  Deleted {t_links} trainer-assessor links')

        tm = TrainerMapping.objects.count()
        TrainerMapping.objects.all().delete()
        self.stdout.write(f'  Deleted {tm} trainer mappings')

        am = AssessorMapping.objects.count()
        AssessorMapping.objects.all().delete()
        self.stdout.write(f'  Deleted {am} assessor mappings')

        t = Trainer.objects.count()
        Trainer.objects.all().delete()
        self.stdout.write(f'  Deleted {t} trainers')

        a = Assessor.objects.count()
        Assessor.objects.all().delete()
        self.stdout.write(f'  Deleted {a} assessors')

        trainer_users = User.objects.filter(user_type='trainer').count()
        User.objects.filter(user_type='trainer').delete()
        self.stdout.write(f'  Deleted {trainer_users} trainer users')

        assessor_users = User.objects.filter(user_type='assessor').count()
        User.objects.filter(user_type='assessor').delete()
        self.stdout.write(f'  Deleted {assessor_users} assessor users')

    def _seed(self):
        centers = self.get_centers()
        courses = self.get_courses()
        now = timezone.now().date()

        self.stdout.write(f'\nSeeding data for {centers.count()} centers...')

        global_counter = 1000
        for center in centers:
            # Seed 2 trainers
            for i in range(1, 3):
                global_counter += 1
                email = f'trainer{global_counter}@brtc.gov.bd'
                user = User.objects.create_user(
                    email=email,
                    password='trainer@123',
                    user_type='trainer',
                    full_name_bn=f'Trainer{center.code}-{i}',
                    full_name_en=f'Trainer {center.code}-{i}',
                    phone=f'017{global_counter:08d}',
                    nid=f'{global_counter:010d}',
                    is_active=True,
                )
                user.center = center
                user.save(update_fields=['center'])
                trainer = Trainer.objects.create(
                    user=user,
                    trainer_no=f'TRN-{center.code}-{i}',
                    nid=f'{global_counter:010d}',
                    date_of_birth=now.replace(year=now.year - 35 - i),
                    driving_license_no=f'DL-{center.code}-{i}',
                    father_name_bn=f'Father{center.code}-{i}',
                    mother_name_bn=f'Mother{center.code}-{i}',
                    education_qualification='Graduate',
                    years_of_experience=3 + i,
                    expertise_area='Computer',
                    status=Trainer.Status.ACTIVE,
                    approval_status=Trainer.ApprovalStatus.APPROVED,
                )
                for course in courses:
                    TrainerMapping.objects.create(
                        trainer=trainer,
                        center=center,
                        course=course,
                        is_primary=(i == 1),
                        designation='Primary' if i == 1 else 'Assistant',
                        status=TrainerMapping.Status.ACTIVE,
                    )
                self.stdout.write(f'  Created trainer: {trainer.trainer_no} for center {center.code}')

            # Seed 2 assessors
            for i in range(1, 3):
                global_counter += 1
                email = f'assessor{global_counter}@brtc.gov.bd'
                user = User.objects.create_user(
                    email=email,
                    password='assessor@123',
                    user_type='assessor',
                    full_name_bn=f'Assessor{center.code}-{i}',
                    full_name_en=f'Assessor {center.code}-{i}',
                    phone=f'018{global_counter:08d}',
                    nid=f'{global_counter:010d}',
                    is_active=True,
                )
                user.center = center
                user.save(update_fields=['center'])
                assessor = Assessor.objects.create(
                    user=user,
                    assessor_no=f'ASR-{center.code}-{i}',
                    nid=f'{global_counter:010d}',
                    date_of_birth=now.replace(year=now.year - 30 - i),
                    father_name_bn=f'Father{center.code}-{i}A',
                    mother_name_bn=f'Mother{center.code}-{i}A',
                    education_qualification='Post Graduate',
                    years_of_experience=2 + i,
                    expertise_area='Assessment',
                    certification='NACTAR',
                    status=Assessor.Status.ACTIVE,
                    approval_status=Assessor.ApprovalStatus.APPROVED,
                )
                for course in courses:
                    AssessorMapping.objects.create(
                        assessor=assessor,
                        center=center,
                        course=course,
                        is_primary=(i == 1),
                        status=AssessorMapping.Status.ACTIVE,
                    )
                self.stdout.write(f'  Created assessor: {assessor.assessor_no} for center {center.code}')

        self.stdout.write(self.style.SUCCESS(f'\nDone! Seeded trainers and assessors for {centers.count()} centers'))
