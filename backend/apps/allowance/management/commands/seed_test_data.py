import sys
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import date, timedelta, datetime as dt
from decimal import Decimal
from apps.accounts.models import User
from apps.centers.models import Center
from apps.batches.models import Batch, BatchEnrollment, BatchWeekPlan, BatchCalendarDay, Holiday
from apps.courses.models import Course
from apps.trainees.models import Trainee
from apps.attendance.models import Attendance, AttendanceSummary
from apps.allowance.models import AllowanceCategory, AllowanceTier, TraineeAllowance
from apps.trainers.models import Trainer
from apps.assessors.models import Assessor, AssessorMapping
from apps.assessments.models import Assessment

PHONE_COUNTER = [50000000]
NID_COUNTER = [2000000000]

def next_phone():
    c = PHONE_COUNTER[0]
    PHONE_COUNTER[0] += 1
    return f'017{c:08d}'

def next_nid():
    c = NID_COUNTER[0]
    NID_COUNTER[0] += 1
    return str(c)

def log(msg):
    sys.stdout.write(msg + '\n')
    sys.stdout.flush()


class Command(BaseCommand):
    help = 'Seed test data for new features'

    def handle(self, *args, **options):
        log('Seeding test data for new features...')

        centers = list(Center.objects.all())
        if not centers:
            log('[ERROR] No centers found. Run seed_sample_data first.')
            return

        batches = list(Batch.objects.select_related('center', 'course').all())
        if not batches:
            log('[ERROR] No batches found. Run seed_sample_data first.')
            return

        trainees = list(Trainee.objects.select_related('user', 'batch', 'center').all())
        if not trainees:
            log('[ERROR] No trainees found. Run seed_sample_data first.')
            return

        trainers = list(Trainer.objects.select_related('user').all())
        if not trainers:
            log('[ERROR] No trainers found. Run seed_sample_data first.')
            return

        # 1. Seed accountant users
        log('  -- Accountant Users --')
        acct_count = 0
        for center in centers:
            email = f'accountant_{center.code.lower()}@brtc.gov.bd'
            try:
                user = User.objects.get(email=email)
            except User.DoesNotExist:
                user = User.objects.create(
                    email=email, user_type='accountant',
                    full_name_bn=f'{center.name_bn} accountant',
                    full_name_en=f'{center.name_en} Accountant',
                    phone=next_phone(),
                    nid=next_nid(),
                    center=center,
                )
                acct_count += 1
            user.set_password('accountant123')
            user.save(update_fields=['password'])
        log(f'  [OK] {acct_count} accountant users created')

        # 2. Assign shifts to batches
        log('  -- Batch Shifts --')
        shift_count = 0
        for i, batch in enumerate(batches):
            if not batch.shift:
                batch.shift = 'shift_1' if i % 2 == 0 else 'shift_2'
                batch.save(update_fields=['shift'])
                shift_count += 1
        log(f'  [OK] {shift_count} batches assigned shifts')

        # 2.5. Create week plans for batches without any
        log('  -- Batch Week Plans --')
        wp_count = 0
        for batch in batches:
            if BatchWeekPlan.objects.filter(batch=batch).exists():
                continue
            if not trainers:
                continue
            lead = trainers[0]
            associate = trainers[1] if len(trainers) > 1 else None
            plan = [
                (6, 1, 'theory', '9:00', '11:00', 'তত্ত্ব', 'Theory'),
                (6, 2, 'practical', '11:30', '13:00', 'ব্যবহারিক', 'Practical'),
                (0, 3, 'theory', '9:00', '11:00', 'তত্ত্ব', 'Theory'),
                (0, 4, 'practical', '11:30', '13:00', 'ব্যবহারিক', 'Practical'),
                (1, 5, 'practical', '9:00', '11:00', 'ব্যবহারিক', 'Practical'),
                (2, 6, 'theory', '9:00', '11:00', 'তত্ত্ব', 'Theory'),
                (3, 7, 'practical', '9:00', '11:00', 'ব্যবহারিক', 'Practical'),
                (4, 8, 'theory', '9:00', '11:00', 'তত্ত্ব', 'Theory'),
            ]
            for day_of_week, session_no, ct, st, et, topic_bn, topic_en in plan:
                start_time = dt.strptime(st, '%H:%M').time()
                end_time = dt.strptime(et, '%H:%M').time()
                dur = round((dt.strptime(et, '%H:%M') - dt.strptime(st, '%H:%M')).seconds / 3600, 1)
                BatchWeekPlan.objects.get_or_create(
                    batch=batch, term_no=1, term_day=day_of_week, session_no=session_no,
                    defaults=dict(
                        class_type=ct, start_date=batch.start_date, end_date=batch.end_date,
                        day_of_week=day_of_week,
                        start_time=start_time, end_time=end_time,
                        duration_hours=Decimal(str(dur)),
                        training_room_bn='কক্ষ ১০১', training_room_en='Room 101',
                        lead_trainer=lead, associate_trainer=associate,
                        topic_bn=topic_bn, topic_en=topic_en,
                    ),
                )
                wp_count += 1
        log(f'  [OK] {wp_count} week plans created')

        # 3. Seed BatchCalendarDay
        log('  -- Batch Calendar Days --')
        cal_count = 0
        for batch in batches:
            week_plans = BatchWeekPlan.objects.filter(batch=batch)
            if not week_plans.exists():
                continue
            day_sessions = {}
            for wp in week_plans:
                day_sessions.setdefault(wp.day_of_week, set()).add(wp.session_no)
            py_to_plan = {0: 1, 1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 0}
            current = batch.start_date
            holidays = set(Holiday.objects.filter(
                date__gte=batch.start_date, date__lte=batch.end_date,
            ).values_list('date', flat=True))
            while current <= batch.end_date:
                if current.weekday() in (4, 5) or current in holidays:
                    current += timedelta(days=1)
                    continue
                plan_dow = py_to_plan[current.weekday()]
                if plan_dow in day_sessions:
                    _, created = BatchCalendarDay.objects.get_or_create(
                        batch=batch, date=current,
                        defaults=dict(total_sessions=len(day_sessions[plan_dow]), is_generated=True),
                    )
                    if created:
                        cal_count += 1
                current += timedelta(days=1)
        log(f'  [OK] {cal_count} calendar days created')

        # 4. Seed attendance records
        log('  -- Attendance Records --')
        att_count = 0
        for batch in batches:
            cal_days = BatchCalendarDay.objects.filter(batch=batch, is_generated=True, is_holiday=False)
            if not cal_days.exists():
                continue
            active_enrollments = BatchEnrollment.objects.filter(
                batch=batch, status=BatchEnrollment.EnrollmentStatus.ACTIVE,
            ).select_related('trainee')
            lead = trainers[0] if trainers else None
            associate = trainers[1] if len(trainers) > 1 else None
            for cal_day in cal_days:
                for i, enrollment in enumerate(active_enrollments):
                    for session_no in range(1, cal_day.total_sessions + 1):
                        status_choice = (
                            Attendance.Status.PRESENT if i % 20 < 14
                            else Attendance.Status.LATE if i % 20 < 17
                            else Attendance.Status.ABSENT if i % 20 < 19
                            else Attendance.Status.LEAVE
                        )
                        _, created = Attendance.objects.get_or_create(
                            trainee=enrollment.trainee, batch=batch,
                            session_date=cal_day.date, session_no=session_no,
                            defaults=dict(
                                status=status_choice, lead_trainer=lead,
                                associate_trainer=associate,
                                marked_by=lead.user if lead else None,
                            ),
                        )
                        if created:
                            att_count += 1
            for enrollment in active_enrollments:
                summary, _ = AttendanceSummary.objects.get_or_create(
                    trainee=enrollment.trainee, batch=batch,
                )
                summary.refresh()
        log(f'  [OK] {att_count} attendance records created')

        # 5. Seed Allowance Categories + Tiers
        log('  -- Allowance Categories & Tiers --')
        cat_ps, _ = AllowanceCategory.objects.get_or_create(
            name_bn='Per Session Allowance', name_en='Per Session Allowance',
            defaults=dict(amount_per_session=Decimal('150.00'), calculation_basis='per_session', is_active=True),
        )
        cat_tier, _ = AllowanceCategory.objects.get_or_create(
            name_bn='Tiered Allowance', name_en='Tiered Allowance',
            defaults=dict(amount_per_session=Decimal('200.00'), calculation_basis='tiered', is_active=True),
        )
        log(f'  [OK] Categories: per_session(150), tiered(200)')

        tier_configs = [
            (cat_tier, 'Platinum', 90, 100, Decimal('1.50')),
            (cat_tier, 'Gold', 80, 89.99, Decimal('1.25')),
            (cat_tier, 'Silver', 70, 79.99, Decimal('1.00')),
            (cat_tier, 'Bronze', 60, 69.99, Decimal('0.75')),
            (cat_tier, 'Base', 0, 59.99, Decimal('0.50')),
        ]
        tier_count = 0
        for cat, name, min_p, max_p, mult in tier_configs:
            _, created = AllowanceTier.objects.get_or_create(
                category=cat, min_percentage=min_p, max_percentage=max_p,
                defaults=dict(name_bn=name, name_en=name, multiplier=mult, is_active=True),
            )
            if created:
                tier_count += 1
        log(f'  [OK] {tier_count} allowance tiers created (Platinum 1.5x to Base 0.5x)')

        # 6. Seed TraineeAllowance records
        log('  -- Trainee Allowance Records --')
        ta_count = 0
        for batch in batches:
            active_enrollments = BatchEnrollment.objects.filter(
                batch=batch, status=BatchEnrollment.EnrollmentStatus.ACTIVE,
            )
            for enrollment in active_enrollments:
                for cat in [cat_ps, cat_tier]:
                    summary = AttendanceSummary.objects.filter(
                        trainee=enrollment.trainee, batch=batch,
                    ).first()
                    if not summary:
                        continue
                    allowance, created = TraineeAllowance.objects.get_or_create(
                        trainee=enrollment.trainee, batch=batch, category=cat,
                        defaults=dict(
                            total_sessions=summary.total_sessions,
                            attended_sessions=summary.attended_sessions,
                        ),
                    )
                    if created:
                        allowance.calculate()
                        ta_count += 1
        log(f'  [OK] {ta_count} allowance records created')

        # 7. Update trainee mobile banking info
        log('  -- Trainee Mobile Banking --')
        mb_count = 0
        providers = ['bkash', 'nagad', 'rocket']
        for i, trainee in enumerate(trainees):
            if not trainee.mobile_banking_number:
                trainee.mobile_banking_provider = providers[i % len(providers)]
                trainee.mobile_banking_number = next_phone()
                trainee.save(update_fields=['mobile_banking_provider', 'mobile_banking_number'])
                mb_count += 1
        log(f'  [OK] {mb_count} trainees updated with mobile banking')

        # 8. Set known credentials for all non-admin users
        log('  -- User Credentials --')
        cred_count = 0
        for trainee in trainees:
            trainee.user.set_password('trainee123')
            trainee.user.save(update_fields=['password'])
            cred_count += 1
        for trainer in trainers:
            trainer.user.set_password('trainer123')
            trainer.user.save(update_fields=['password'])
            cred_count += 1
        for assessor in Assessor.objects.select_related('user').all():
            assessor.user.set_password('assessor123')
            assessor.user.save(update_fields=['password'])
            cred_count += 1
        log(f'  [OK] {cred_count} user passwords set (trainee123 / trainer123 / assessor123)')

        # 10. Seed Assessment records
        log('  -- Assessment Records --')
        assm_count = 0
        assessment_types = list(Assessment.AssessmentType.values)
        competency_pool = ['competent', 'competent', 'competent', 'not_competent', 'absent']
        for batch in batches:
            mappings = list(AssessorMapping.objects.filter(
                center=batch.center, course=batch.course, status='active',
            ).select_related('assessor__user'))
            if not mappings:
                continue
            mapping = mappings[0]
            enrollments = list(BatchEnrollment.objects.filter(
                batch=batch, status=BatchEnrollment.EnrollmentStatus.ACTIVE,
            )[:6])
            if not enrollments:
                continue
            for ei, enrollment in enumerate(enrollments):
                num_assessments = (ei % 4) + 2
                for ai in range(num_assessments):
                    atype = assessment_types[ai % len(assessment_types)]
                    pct = enrollment.trainee.user.id + ei + ai
                    marks_obtained = (pct * 80) % 90 + 10
                    total_marks = 100
                    comp = competency_pool[(ei + ai) % len(competency_pool)]
                    _, created = Assessment.objects.get_or_create(
                        trainee=enrollment.trainee,
                        batch=batch,
                        assessment_type=atype,
                        is_reassessment=False,
                        defaults=dict(
                            assessor=mapping.assessor,
                            assessment_date=date.today() - timedelta(days=ai * 3),
                            competency_status=comp,
                            marks_obtained=marks_obtained,
                            total_marks=total_marks,
                            remarks='Test assessment',
                            assessed_by=mapping.assessor.user,
                        ),
                    )
                    if created:
                        assm_count += 1
        log(f'  [OK] {assm_count} assessment records created')

        log('')
        log('===================================')
        log('Test data seeding complete!')
        log('')
        log('New accounts:')
        for center in centers:
            log(f'  accountant_{center.code.lower()}@brtc.gov.bd / accountant123 ({center.code})')
        log('  trainer@brtc.gov.bd / trainer123 (Trainer Rahim)')
        log('  trainer2@brtc.gov.bd / trainer123')
        log('  trainer3@brtc.gov.bd / trainer123')
        log('  trainer4@brtc.gov.bd / trainer123')
        log('  assessor@brtc.gov.bd / assessor123 (global assessor)')
        log('  assessor2@brtc.gov.bd / assessor123')
        log('  assessor3@brtc.gov.bd / assessor123')
        log('  trainee@brtc.gov.bd through trainee12@brtc.gov.bd / trainee123')
        log('')
        log('Features tested:')
        log('  [OK] Accountant user type')
        log('  [OK] Batch shifts (shift_1 / shift_2)')
        log('  [OK] Calendar days auto-generated')
        log('  [OK] Attendance (PRESENT/LATE=0.5/ABSENT/LEAVE)')
        log('  [OK] Per-session & tiered allowance categories')
        log('  [OK] 5 allowance tiers (Platinum 1.5x to Base 0.5x)')
        log('  [OK] Trainee mobile banking (bKash/Nagad/Rocket)')
        log('  [OK] Allowance records with calculated amounts')
        log('  [OK] Trainer, Trainee & Assessor test credentials')
        log('  [OK] Assessment records (assessor↔trainee linking)')
        log('===================================')
