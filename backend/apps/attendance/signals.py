from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

from .models import Attendance, AttendanceSummary


def _update_summary(trainee_id, batch_id):
    summary, created = AttendanceSummary.objects.get_or_create(
        trainee_id=trainee_id,
        batch_id=batch_id,
    )
    summary.refresh()


@receiver(post_save, sender=Attendance)
def attendance_saved(sender, instance, **kwargs):
    _update_summary(instance.trainee_id, instance.batch_id)


@receiver(post_delete, sender=Attendance)
def attendance_deleted(sender, instance, **kwargs):
    _update_summary(instance.trainee_id, instance.batch_id)