from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import BatchEnrollment
from apps.trainees.models import Trainee


@receiver(post_save, sender=BatchEnrollment)
def sync_trainee_batch_on_save(sender, instance, created, **kwargs):
    if instance.status == 'active':
        Trainee.objects.filter(id=instance.trainee_id).update(batch_id=instance.batch_id)
    else:
        Trainee.objects.filter(id=instance.trainee_id, batch_id=instance.batch_id).update(batch_id=None)


@receiver(post_delete, sender=BatchEnrollment)
def sync_trainee_batch_on_delete(sender, instance, **kwargs):
    Trainee.objects.filter(id=instance.trainee_id, batch_id=instance.batch_id).update(batch_id=None)
