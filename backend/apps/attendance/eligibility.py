from decimal import Decimal

from django.db.models import Q, Count

from .models import Attendance, AttendanceSummary

ATTENDANCE_THRESHOLD = Decimal('80.00')


def check_trainee_eligibility(trainee_id, batch_id):
    """Returns (is_eligible: bool, percentage: Decimal, summary: dict)."""
    summary, created = AttendanceSummary.objects.get_or_create(
        trainee_id=trainee_id,
        batch_id=batch_id,
    )
    if created:
        summary.refresh()

    is_eligible = summary.attendance_percentage >= ATTENDANCE_THRESHOLD
    return is_eligible, summary.attendance_percentage, {
        'total_sessions': summary.total_sessions,
        'attended_sessions': summary.attended_sessions,
        'attendance_percentage': float(summary.attendance_percentage),
    }


def filter_eligible_trainees(trainee_ids, batch_id):
    """Given a list of trainee IDs, return those who meet the threshold."""
    eligible = []
    ineligible = []
    for tid in trainee_ids:
        is_eligible, pct, _ = check_trainee_eligibility(tid, batch_id)
        if is_eligible:
            eligible.append(tid)
        else:
            ineligible.append({'trainee_id': tid, 'percentage': float(pct)})
    return eligible, ineligible


def get_batch_eligibility(batch_id, threshold=80):
    """Return full eligibility data for a batch."""
    summaries = AttendanceSummary.objects.select_related(
        'trainee__user',
    ).filter(batch_id=batch_id).order_by('attendance_percentage')

    threshold = Decimal(str(threshold))
    data = []
    for s in summaries:
        is_eligible = s.attendance_percentage >= threshold
        data.append({
            'trainee_id': s.trainee_id,
            'trainee_name': s.trainee.user.full_name_bn,
            'trainee_reg_no': s.trainee.registration_no,
            'total_sessions': s.total_sessions,
            'attended_sessions': s.attended_sessions,
            'attendance_percentage': float(s.attendance_percentage),
            'is_eligible': is_eligible,
        })

    return {
        'threshold': float(threshold),
        'eligible_count': sum(1 for d in data if d['is_eligible']),
        'ineligible_count': sum(1 for d in data if not d['is_eligible']),
        'trainees': data,
    }
