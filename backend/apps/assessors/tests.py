from datetime import date
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from apps.accounts.models import User
from apps.trainers.models import Trainer
from apps.assessors.models import Assessor, TrainerAssessorLink


class HOAssessorConversionTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.ho_user = User.objects.create_user(
            email='ho@brtc.gov.bd', password='ho123',
            full_name_bn='হেড অফিস', full_name_en='Head Office',
            phone='01111111111', nid='1111111111',
            user_type='head_office',
        )

        self.trainer_user = User.objects.create_user(
            email='trainer@brtc.gov.bd', password='trainer123',
            full_name_bn='প্রশিক্ষক', full_name_en='Trainer',
            phone='02222222222', nid='2222222222',
            user_type='trainer',
        )

        self.trainer = Trainer.objects.create(
            user=self.trainer_user,
            trainer_no='TRN24050001',
            nid='2222222222',
            date_of_birth=date(1990, 1, 1),
            father_name_bn='পিতা',
            mother_name_bn='মাতা',
            education_qualification='স্নাতক',
            years_of_experience=5,
            expertise_area='আইটি',
            bank_account_no='123456789',
            bank_name='সোনালী ব্যাংক',
        )

        self.client.force_authenticate(user=self.ho_user)
        self.convert_url = reverse('ho-assessor-convert')

    def test_convert_trainer_to_assessor(self):
        response = self.client.post(self.convert_url, {
            'trainer_id': self.trainer.id,
            'retain_trainer_status': True,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.data
        self.assertEqual(data['status'], 'converted')
        self.assertEqual(data['trainer_no'], 'TRN24050001')
        self.assertTrue(data['assessor_no'].startswith('ASR'))
        self.assertTrue(data['retain_trainer'])
        self.assertIsNotNone(data['assessor'])
        self.assertEqual(data['assessor']['nid'], '2222222222')
        self.assertEqual(data['assessor']['father_name_bn'], 'পিতা')
        self.assertEqual(data['assessor']['mother_name_bn'], 'মাতা')
        self.assertEqual(data['assessor']['education_qualification'], 'স্নাতক')
        self.assertTrue(Assessor.objects.filter(assessor_no=data['assessor_no']).exists())
        self.assertTrue(TrainerAssessorLink.objects.filter(
            trainer=self.trainer, assessor__assessor_no=data['assessor_no'],
        ).exists())
        self.trainer.refresh_from_db()
        self.assertEqual(self.trainer.status, Trainer.Status.PENDING)

    def test_convert_trainer_and_suspend_original(self):
        response = self.client.post(self.convert_url, {
            'trainer_id': self.trainer.id,
            'retain_trainer_status': False,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.trainer.refresh_from_db()
        self.assertEqual(self.trainer.status, Trainer.Status.SUSPENDED)

    def test_duplicate_conversion_fails(self):
        self.client.post(self.convert_url, {
            'trainer_id': self.trainer.id,
        }, format='json')
        response = self.client.post(self.convert_url, {
            'trainer_id': self.trainer.id,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('ইতিমধ্যে', response.data['error'])

    def test_conversion_missing_trainer_id(self):
        response = self.client.post(self.convert_url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('trainer_id', str(response.data))

    def test_conversion_nonexistent_trainer(self):
        response = self.client.post(self.convert_url, {
            'trainer_id': 99999,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_conversion_unauthenticated(self):
        self.client.force_authenticate(user=None)
        response = self.client.post(self.convert_url, {
            'trainer_id': self.trainer.id,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_conversion_non_ho_user(self):
        trainer_user2 = User.objects.create_user(
            email='center@brtc.gov.bd', password='center123',
            full_name_bn='কেন্দ্র', full_name_en='Center',
            phone='03333333333', nid='3333333333',
            user_type='center_admin',
        )
        self.client.force_authenticate(user=trainer_user2)
        response = self.client.post(self.convert_url, {
            'trainer_id': self.trainer.id,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class HOAssessorBatchAssessmentTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.ho_user = User.objects.create_user(
            email='ho2@brtc.gov.bd', password='ho123',
            full_name_bn='হেড অফিস', full_name_en='Head Office',
            phone='04444444444', nid='4444444444',
            user_type='head_office',
        )
        self.client.force_authenticate(user=self.ho_user)

        from apps.centers.models import Center
        from apps.courses.models import Course
        from apps.batches.models import Batch
        from apps.trainees.models import Trainee

        self.center = Center.objects.create(
            code='C001', name_bn='কেন্দ্র', name_en='Center',
            status='active',
        )
        self.course = Course.objects.create(
            code='CRS01', name_bn='কোর্স', name_en='Course',
            course_type='vocational', term='1', session='2025',
            duration_months=3, duration_hours=100,
            total_training_days=30, fee=0, unit_cost=0, total_target=0,
            stipend_eligible=False, employment_eligible=False,
            status='active',
        )
        from apps.circulars.models import Circular
        self.circular = Circular.objects.create(
            center=self.center, course=self.course,
            title_bn='সার্কুলার', title_en='Circular',
            description='Test',
            application_start_date=date(2024, 12, 1),
            application_end_date=date(2024, 12, 31),
            training_start_date=date(2025, 1, 1),
            training_end_date=date(2025, 1, 31),
            total_seats=30, remaining_seats=30,
            status='published',
        )
        self.batch = Batch.objects.create(
            batch_no='BATCH-2025-00001',
            center=self.center, course=self.course,
            circular=self.circular,
            batch_name_bn='ব্যাচ ১', batch_name_en='Batch 1',
            start_date=date(2025, 1, 1), end_date=date(2025, 1, 31),
            total_seats=30, filled_seats=25,
        )
        assessor_user = User.objects.create_user(
            email='asr@brtc.gov.bd', password='asr123',
            full_name_bn='মূল্যায়নকারী', full_name_en='Assessor',
            phone='05555555555', nid='5555555555',
            user_type='assessor',
        )
        self.assessor = Assessor.objects.create(
            user=assessor_user, assessor_no='ASR25010001',
            nid='5555555555', date_of_birth=date(1985, 5, 5),
            father_name_bn='পিতা', mother_name_bn='মাতা',
            education_qualification='স্নাতকোত্তর',
            years_of_experience=8, expertise_area='প্রশিক্ষণ',
        )
        trainee_user = User.objects.create_user(
            email='trainee@brtc.gov.bd', password='trainee123',
            full_name_bn='প্রশিক্ষণার্থী', full_name_en='Trainee',
            phone='06666666666', nid='6666666666',
            user_type='trainee',
        )
        self.trainee = Trainee.objects.create(
            user=trainee_user, registration_no='TRAINEE001',
            center=self.center,
        )

    def test_batches_endpoint_empty(self):
        url = reverse('ho-assessor-batches', args=[self.assessor.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_assessments_endpoint_empty(self):
        url = reverse('ho-assessor-assessments', args=[self.assessor.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 0)
        self.assertEqual(response.data['results'], [])

    def _ensure_attendance_eligibility(self):
        from apps.attendance.models import AttendanceSummary
        AttendanceSummary.objects.update_or_create(
            trainee=self.trainee, batch=self.batch,
            defaults={'total_sessions': 10, 'attended_sessions': 10, 'attendance_percentage': 100},
        )

    def test_assessments_endpoint_with_data(self):
        from apps.assessments.models import Assessment
        self._ensure_attendance_eligibility()
        Assessment.objects.create(
            trainee=self.trainee, batch=self.batch,
            assessor=self.assessor,
            assessment_type='written',
            assessment_date=date(2025, 1, 15),
            competency_status='competent',
            marks_obtained=80, total_marks=100,
        )
        url = reverse('ho-assessor-assessments', args=[self.assessor.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['assessment_type_display'], 'লিখিত')
        self.assertEqual(results[0]['competency_status'], 'competent')
        self.assertEqual(float(results[0]['marks_obtained']), 80.0)

    def test_batches_endpoint_with_assessment(self):
        from apps.assessments.models import Assessment
        self._ensure_attendance_eligibility()
        Assessment.objects.create(
            trainee=self.trainee, batch=self.batch,
            assessor=self.assessor,
            assessment_type='viva',
            assessment_date=date(2025, 1, 20),
            competency_status='competent',
            marks_obtained=45, total_marks=50,
        )
        url = reverse('ho-assessor-batches', args=[self.assessor.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['batch_no'], 'BATCH-2025-00001')
        self.assertEqual(response.data[0]['assessments_count'], 1)
