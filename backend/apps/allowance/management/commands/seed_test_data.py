import sys
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import date, timedelta
from decimal import Decimal
from apps.accounts.models import User
from apps.centers.models import Center
from apps.batches.models import Batch, BatchEnrollment, BatchWeekPlan, BatchCalendarDay, Holiday
from apps.trainees.models import Trainee
from apps.attendance.models import Attendance, AttendanceSummary
from apps.allowance.models import AllowanceCategory, AllowanceTier, TraineeAllowance
from apps.trainers.models import Trainer


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
        for ci, center in enumerate(centers):
            email = f'accountant_{center.code.lower()}@brtc.gov.bd'
            try:
                user = User.objects.get(email=email)
            except User.DoesNotExist:
                user = User.objects.create(
                    email=email, user_type='accountant',
                    full_name_bn=f'{center.name_bn} accountant',
                    full_name_en=f'{center.name_en} Accountant',
                    phone=f'017{90000000 + ci:08d}',
                    nid=f'{9999999900 + ci}',
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
                trainee.mobile_banking_number = f'017{80000000 + i:08d}'
                trainee.save(update_fields=['mobile_banking_provider', 'mobile_banking_number'])
                mb_count += 1
        log(f'  [OK] {mb_count} trainees updated with mobile banking')

        log('')
        log('===================================')
        log('Test data seeding complete!')
        log('')
        log('New accounts:')
        for center in centers:
            log(f'  accountant_{center.code.lower()}@brtc.gov.bd / accountant123 ({center.code})')
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
        log('===================================')
