import uuid
from django.db.models import F
from django.db.models.signals import pre_save
from django.dispatch import receiver
from django.utils import timezone
from django.apps import apps
from .models import Circular


def generate_public_url():
    return uuid.uuid4().hex[:12]


@receiver(pre_save, sender=Circular)
def handle_circular_publish(sender, instance, **kwargs):
    if not instance.pk:
        return
    try:
        old = sender.objects.get(pk=instance.pk)
    except sender.DoesNotExist:
        return

    was_draft = old.status == Circular.Status.DRAFT
    now_published = instance.status == Circular.Status.PUBLISHED

    if was_draft and now_published:
        if not instance.public_url:
            instance.public_url = generate_public_url()
        instance.published_at = timezone.now()


@receiver(pre_save, sender='applications.Application')
def update_circular_seats_on_status_change(sender, instance, **kwargs):
    Application = apps.get_model('applications', 'Application')

    if not instance.pk:
        return

    try:
        old = Application.objects.get(pk=instance.pk)
    except Application.DoesNotExist:
        return

    if old.status == instance.status:
        return

    if instance.status == Application.ApplicationStatus.SELECTED:
        Circular.objects.filter(pk=instance.circular_id).update(
            remaining_seats=F('remaining_seats') - 1,
        )
    elif old.status == Application.ApplicationStatus.SELECTED:
        Circular.objects.filter(pk=instance.circular_id).update(
            remaining_seats=F('remaining_seats') + 1,
        )
