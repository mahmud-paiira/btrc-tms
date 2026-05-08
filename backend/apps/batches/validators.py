from django.core.exceptions import ValidationError
from django.db.models import Q
from .models import BatchWeekPlan, Batch


def validate_no_trainer_overlap(trainer_id, day_of_week, start_time, end_time, exclude_id=None):
    qs = BatchWeekPlan.objects.filter(
        lead_trainer_id=trainer_id,
        day_of_week=day_of_week,
    )
    if exclude_id:
        qs = qs.exclude(pk=exclude_id)

    for existing in qs:
        if _times_overlap(start_time, end_time, existing.start_time, existing.end_time):
            existing_batch = existing.batch
            raise ValidationError(
                f'প্রধান প্রশিক্ষক (ID: {trainer_id}) এর ইতিমধ্যে '
                f'"{existing.batch.batch_name_bn}" ব্যাচের '
                f'টার্ম {existing.term_no}, সেশন {existing.session_no} '
                f'({existing.start_time}-{existing.end_time}) সময়ে ক্লাস নির্ধারিত আছে।'
            )


def _times_overlap(t1_start, t1_end, t2_start, t2_end):
    return t1_start < t2_end and t2_start < t1_end


def validate_batch_hours_match_course(batch_id):
    from django.db.models import Sum
    batch = Batch.objects.get(pk=batch_id)
    total_planned = BatchWeekPlan.objects.filter(
        batch=batch
    ).aggregate(Sum('duration_hours'))['duration_hours__sum'] or 0
    course_hours = batch.course.duration_hours
    if abs(float(total_planned) - float(course_hours)) > 1.0:
        return False, total_planned, course_hours
    return True, total_planned, course_hours
