"""
Seed comprehensive test data for a trainee so all menu items show real data.

Usage:
    python seed_trainee_data.py [phone_number]

If phone_number is omitted, it registers a new applicant.

Checks for existing batch/plans/attendance/assessments/certificates
and reuses them if they already exist.
"""
import os
import sys
import random
from datetime import date, timedelta, time

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'brtc_tms.settings')
import django; django.setup()

from django.contrib.auth import get_user_model
from django.db import transaction

from apps.accounts.models import User
from apps.trainees.models import Trainee
from apps.batches.models import Batch, BatchWeekPlan, BatchEnrollment
from apps.attendance.models import Attendance, AttendanceSummary
from apps.assessments.models import Assessment
from apps.certificates.models import Certificate
from apps.trainers.models import Trainer
from apps.assessors.models import Assessor
from apps.circulars.models import Circular
from apps.courses.models import Course
from apps.centers.models import Center

User = get_user_model()

GREEN = '\033[92m'
YELLOW = '\033[93m'
CYAN = '\033[96m'
RED = '\033[91m'
RESET = '\033[0m'

def ok(msg): print(f'  {GREEN}\u2713 {msg}{RESET}')
def skip(msg): print(f'  {YELLOW}\u26A0 {msg}{RESET}')
def fail(msg): print(f'  {RED}\u2717 {msg}{RESET}')
def step(n, msg): print(f'\n{CYAN}[{n}] {msg}{RESET}')
def info(msg): print(f'    {msg}')

# ── circular / course / center to use ──
CIRCULAR_ID = 13
COURSE_ID = 10
CENTER_ID = 51  # বরিশাল প্রশিক্ষণ কেন্দ্র

def get_or_create_trainee(phone=None):
    """Get existing or register-and-apply a new trainee."""
    if phone:
        try:
            u = User.objects.get(phone=phone)
            t = Trainee.objects.filter(user=u).first()
            if t:
                ok(f'Using existing trainee: phone={phone}, reg={t.registration_no}')
                return u, t
            else:
                ok(f'User {phone} exists; finding application...')
                app = Application.objects.filter(user=u).order_by('-applied_at').first()
                if app and app.status == 'selected':
                    t = Trainee.objects.filter(application=app, user=u).first()
                    if t:
                        ok(f'Trainee found via application: {t.registration_no}')
                        return u, t
                skip('Trainee record not found; will create new one')
        except User.DoesNotExist:
            skip(f'Phone {phone} not found; registering new')
    else:
        skip('No phone given; registering new applicant')

    # Register
    from django.utils.crypto import get_random_string
    new_phone = f'017{random.randint(10000000, 99999999)}'
    password = 'test123456'
    info(f'Registering phone={new_phone}')

    # Use direct model creation like e2e test
    user = User.objects.create_user(
        phone=new_phone,
        email=f'phone_{new_phone}@brtc.app',
        password=password,
        full_name_bn='পরীক্ষামূলক প্রশিক্ষণার্থী',
        full_name_en='Test Trainee',
        nid=f'{random.randint(1000000000, 9999999999)}',
        user_type='trainee',
        is_phone_verified=True,
    )
    user.set_password(password)
    user.save()
    ok(f'User created: id={user.id}, phone={new_phone}')

    # Submit application via direct model creation
    circular = Circular.objects.get(id=CIRCULAR_ID)
    center = Center.objects.get(id=CENTER_ID)
    course = Course.objects.get(id=COURSE_ID)

    from apps.applications.models import Application
    from apps.system_config.models import Gender
    male_gender_obj = Gender.objects.filter(name_en='Male').first()
    app = Application.objects.create(
        user=user,
        circular=circular,
        chosen_center=center,
        name_bn='পরীক্ষামূলক প্রশিক্ষণার্থী',
        name_en='Test Trainee',
        phone=new_phone,
        nid=user.nid,
        father_name_bn='পিতা',
        mother_name_bn='মাতা',
        present_address='ঠিকানা',
        date_of_birth=date(1995, 1, 1),
        gender=male_gender_obj,
        status='selected',
        education_qualification='এইচএসসি',
    )
    # Refresh from DB to get auto-generated application_no
    app.refresh_from_db()
    ok(f'Application created: {app.application_no}')

    # Trainee should be created by signal
    t = Trainee.objects.filter(application=app, user=user).first()
    if t:
        ok(f'Trainee auto-created: {t.registration_no}')
    else:
        info('Signal did not fire; creating trainee manually...')
        t = Trainee.objects.create(
            user=user,
            application=app,
            center=center,
            status='enrolled',
        )
        ok(f'Trainee manually created: {t.registration_no}')

    info(f'{YELLOW}Credentials: phone={new_phone}, password={password}{RESET}')
    return user, t


@transaction.atomic
def seed_data(user, trainee):
    """Seed batch, week plans, attendance, assessments, certificate."""

    center = trainee.center or Center.objects.get(id=CENTER_ID)
    circular = Circular.objects.get(id=CIRCULAR_ID)
    course = Course.objects.get(id=COURSE_ID)

    # ── Step 1: Ensure Batch exists ──
    batch = trainee.batch
    if not batch:
        batch = Batch.objects.filter(
            circular=circular, center=center, course=course,
        ).order_by('-id').first()

    if not batch:
        batch = Batch.objects.create(
            circular=circular,
            center=center,
            course=course,
            batch_name_bn=f'{course.name_bn} - সিড ব্যাচ',
            batch_name_en=f'{course.name_en} - Seed Batch',
            start_date=circular.training_start_date or date.today(),
            end_date=circular.training_end_date or (date.today() + timedelta(days=120)),
            total_seats=25,
            filled_seats=1,
            status='running',
            shift='shift_1',
            created_by=user,
        )
        skip(f'Created new batch: {batch.batch_no}')
    else:
        ok(f'Using existing batch: {batch.batch_no}')

    # Ensure trainee is linked to batch
    changed = False
    if trainee.batch_id != batch.id:
        trainee.batch = batch
        trainee.save(update_fields=['batch'])
        changed = True

    enrollment, created = BatchEnrollment.objects.get_or_create(
        trainee=trainee, batch=batch,
        defaults={'status': 'active'},
    )
    if created or changed:
        ok(f'Trainee enrolled in batch: {batch.batch_no}')

    # ── Step 2: Ensure Trainers exist ──
    lead_trainer = Trainer.objects.filter(
        user__user_type='trainer'
    ).select_related('user').first()
    if not lead_trainer:
        # Create a trainer user
        trainer_user, _ = User.objects.get_or_create(
            phone='01700000001',
            defaults=dict(
                email='trainer_seed@brtc.app',
                full_name_bn='প্রশিক্ষক (সিড)',
                full_name_en='Trainer Seed',
                user_type='trainer',
                is_phone_verified=True,
            )
        )
        lead_trainer, _ = Trainer.objects.get_or_create(
            user=trainer_user,
            defaults=dict(trainer_no='SEED-TR-001', nid='1234567890',
                          date_of_birth=date(1980, 1, 1),
                          father_name_bn='পিতা', mother_name_bn='মাতা',
                          education_qualification='বিএ',
                          years_of_experience=10, expertise_area='ড্রাইভিং',
                          status='active', approval_status='approved')
        )
        skip(f'Created trainer: {lead_trainer.user.full_name_bn}')

    associate = Trainer.objects.filter(
        user__user_type='trainer'
    ).select_related('user').exclude(id=lead_trainer.id).first()

    # ── Step 3: Ensure Week Plans exist ──
    existing_plans = BatchWeekPlan.objects.filter(batch=batch).count()
    if existing_plans == 0:
        # Create 2 weeks of plans (Sun-Thu, 3 sessions per day)
        plan_count = 0
        start_dates = []
        d = batch.start_date
        while d <= batch.end_date and len(start_dates) < 10:
            if d.weekday() < 5:  # Sun=0 to Thu=4 (weekday 0-4)
                start_dates.append(d)
            d += timedelta(days=1)

        for day_offset, sdate in enumerate(start_dates[:10]):
            term_no = 1
            term_day = day_offset + 1
            dow = sdate.weekday()
            # Map Python weekday (0=Mon) to DayOfWeek (0=Sun,6=Sat)
            # Actually the model uses DayOfWeek with SATURDAY=6 (0), SUNDAY=0 (1), etc
            # Python: Mon=0, Tue=1, Wed=2, Thu=3, Fri=4, Sat=5, Sun=6
            # Model: SUNDAY=0 (0), MONDAY=1 (1), TUESDAY=2 (2), WEDNESDAY=3, THURSDAY=4, FRIDAY=5
            # SATURDAY=6 (6)
            # So: Python Sun=6 → model SUNDAY=0 (value 0)
            # Python Mon=0 → model MONDAY=1 (value 1)
            # etc.
            # Python weekday: Mon=0, Tue=1, Wed=2, Thu=3, Fri=4, Sat=5, Sun=6
            # Model: SATURDAY=6 (value 6), SUNDAY=0 (value 0), MONDAY=1 (value 1)...
            # Map: Python Mon=0 → model MONDAY=1
            # Python Tue=1 → model TUESDAY=2
            # Python Wed=2 → model WEDNESDAY=3
            # Python Thu=3 → model THURSDAY=4
            # Python Fri=4 → model FRIDAY=5
            # Python Sat=5 → model SATURDAY=6
            # Python Sun=6 → model SUNDAY=0
            if dow == 4 or dow == 5:  # Skip Fri (4), Sat (5) — model Fri=5, Sat=6
                continue
            # Map python weekday to model day_of_week
            day_map = {0: 1, 1: 2, 2: 3, 3: 4, 6: 0}
            model_dow = day_map.get(dow)
            if model_dow is None:
                continue

            for session_no in range(1, 4):
                class_type = 'theory' if session_no <= 2 else 'practical'
                if session_no == 1:
                    st, et = time(9, 0), time(12, 0)
                elif session_no == 2:
                    st, et = time(14, 0), time(17, 0)
                else:
                    st, et = time(18, 0), time(21, 0)

                plan = BatchWeekPlan.objects.create(
                    batch=batch,
                    term_no=term_no,
                    term_day=term_day,
                    session_no=session_no,
                    class_type=class_type,
                    start_date=sdate,
                    end_date=sdate,
                    day_of_week=model_dow,
                    start_time=st,
                    end_time=et,
                    duration_hours=3.0,
                    training_room_bn='কক্ষ ১০১',
                    training_room_en='Room 101',
                    lead_trainer=lead_trainer,
                    associate_trainer=associate,
                    topic_bn=f'পাঠ {term_day}.{session_no} - ড্রাইভিং প্রশিক্ষণ',
                    topic_en=f'Lesson {term_day}.{session_no} - Driving Training',
                )
                plan_count += 1

        if plan_count:
            ok(f'Created {plan_count} week plans for batch')
        else:
            skip('No week plans created (no valid training days found)')
            # Fallback: create one plan for today
            today = date.today()
            dow = today.weekday()
            day_map = {0: 1, 1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 0}
            BatchWeekPlan.objects.create(
                batch=batch, term_no=1, term_day=1, session_no=1,
                class_type='theory',
                start_date=today, end_date=today,
                day_of_week=day_map[dow],
                start_time=time(9, 0), end_time=time(12, 0),
                duration_hours=3.0,
                training_room_bn='কক্ষ ১০১', training_room_en='Room 101',
                lead_trainer=lead_trainer,
                associate_trainer=associate,
                topic_bn='পাঠ ১ - ড্রাইভিং প্রশিক্ষণ',
                topic_en='Lesson 1 - Driving Training',
            )
            ok('Created fallback week plan')
    else:
        ok(f'Week plans already exist: {existing_plans} plans')

    # ── Step 4: Ensure Attendance records exist ──
    existing_att = Attendance.objects.filter(trainee=trainee, batch=batch).count()
    if existing_att == 0:
        plans = BatchWeekPlan.objects.filter(batch=batch)[:6]
        for i, plan in enumerate(plans):
            # Alternate statuses: present, present, late, present, absent, present
            statuses = ['present'] * 6
            statuses[2] = 'late'
            statuses[4] = 'absent'
            Attendance.objects.create(
                trainee=trainee,
                batch=batch,
                session_date=plan.start_date,
                session_no=plan.session_no,
                status=statuses[i % len(statuses)],
                lead_trainer=plan.lead_trainer,
                associate_trainer=plan.associate_trainer,
                marked_by=user,
            )
            AttendanceSummary.objects.update_or_create(
                trainee=trainee, batch=batch,
                defaults=dict(
                    total_sessions=len(plans),
                    attended_sessions=len([s for s in statuses[:len(plans)] if s in ('present', 'late')]),
                    attendance_percentage=80.0,
                )
            )
        ok(f'Created {len(plans)} attendance records')
    else:
        ok(f'Attendance records already exist: {existing_att}')

    # ── Step 5: Ensure Assessment records exist ──
    existing_ass = Assessment.objects.filter(trainee=trainee, batch=batch).count()
    if existing_ass == 0:
        assessor = Assessor.objects.filter(
            user__user_type='assessor'
        ).select_related('user').first()
        if not assessor:
            assessor_user, _ = User.objects.get_or_create(
                phone='01700000002',
                defaults=dict(
                    email='assessor_seed@brtc.app',
                    full_name_bn='মূল্যায়নকারী (সিড)',
                    full_name_en='Assessor Seed',
                    user_type='assessor',
                    is_phone_verified=True,
                )
            )
            assessor, _ = Assessor.objects.get_or_create(
                user=assessor_user,
                defaults=dict(assessor_no='SEED-AS-001', nid='9876543210',
                              date_of_birth=date(1975, 1, 1),
                              father_name_bn='পিতা', mother_name_bn='মাতা',
                              education_qualification='এমএ',
                              years_of_experience=15, expertise_area='ড্রাইভিং',
                              status='active', approval_status='approved')
            )
            skip(f'Created assessor: {assessor.user.full_name_bn}')

        assessments_data = [
            ('pre_evaluation', 'competent', 85, 100, 'ভালো ফলাফল'),
            ('written', 'competent', 78, 100, 'উত্তীর্ণ'),
            ('viva', 'competent', 90, 100, 'মৌখিক পরীক্ষায় উত্তীর্ণ'),
            ('practical', 'competent', 88, 100, 'ব্যবহারিক দক্ষতা ভালো'),
            ('final', 'competent', 92, 100, 'চূড়ান্ত মূল্যায়নে উত্তীর্ণ'),
        ]
        for idx, (atype, comp_status, marks, total_marks, remarks) in enumerate(assessments_data):
            Assessment.objects.create(
                trainee=trainee,
                batch=batch,
                assessor=assessor,
                assessment_type=atype,
                assessment_date=date.today() - timedelta(days=len(assessments_data) - idx),
                competency_status=comp_status,
                marks_obtained=marks,
                total_marks=total_marks,
                percentage=(marks / total_marks) * 100,
                remarks=remarks,
                assessed_by=assessor.user if assessor else user,
            )

        ok(f'Created {len(assessments_data)} assessment records')
    else:
        ok(f'Assessment records already exist: {existing_ass}')

    # ── Step 6: Ensure Certificate exists ──
    existing_cert = Certificate.objects.filter(trainee=trainee, batch=batch).count()
    if existing_cert == 0:
        # Check if certificate_no needs to be unique; generate one
        cert = Certificate.objects.create(
            trainee=trainee,
            batch=batch,
            certificate_no=f'BRTC-CERT-SEED-{trainee.id:05d}',
            issue_date=date.today(),
            qr_code_url=f'https://verify.brtc.gov.bd/{trainee.registration_no}',
            verification_url=trainee.registration_no,
            is_verified=False,
            verified_count=0,
        )
        ok(f'Certificate created: {cert.certificate_no}')
    else:
        ok(f'Certificate already exists: {existing_cert}')

    # ── Mark batch as completed now that we have all data ──
    if batch.status != 'completed':
        batch.status = 'completed'
        batch.save(update_fields=['status'])
        skip('Batch marked as completed')

    return batch


def main():
    phone = sys.argv[1] if len(sys.argv) > 1 else None

    step(1, 'Get or create trainee')
    user, trainee = get_or_create_trainee(phone)

    step(2, 'Seed batch, week plans, attendance, assessments, certificate')
    batch = seed_data(user, trainee)

    print(f'\n{GREEN}{"═" * 50}{RESET}')
    print(f'{GREEN}All data seeded successfully!{RESET}')
    print(f'{GREEN}{"═" * 50}{RESET}')
    print()
    print(f'  Phone:    {user.phone}')
    print(f'  Password: test123456')
    print(f'  Trainee:  {trainee.registration_no}')
    print(f'  Batch:    {batch.batch_no}')
    print()
    print('  What was created:')
    plans = BatchWeekPlan.objects.filter(batch=batch).count()
    att = Attendance.objects.filter(trainee=trainee, batch=batch).count()
    ass = Assessment.objects.filter(trainee=trainee, batch=batch).count()
    cert = Certificate.objects.filter(trainee=trainee, batch=batch).count()
    print(f'    - Batch: {batch.batch_no} ({batch.status})')
    print(f'    - Week Plans: {plans}')
    print(f'    - Attendance: {att} records')
    print(f'    - Assessments: {ass} records')
    print(f'    - Certificate: {"Yes" if cert else "No"}')
    print()
    print(f'  Login URL: http://localhost:5173/trainee/login')
    print(f'  Use phone + password test123456')

if __name__ == '__main__':
    main()
