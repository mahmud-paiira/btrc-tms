from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings
from .models import Notification


@shared_task
def send_notification(notification_id):
    try:
        notification = Notification.objects.get(id=notification_id)
        if notification.channel in ('email', 'both'):
            send_mail(
                subject=notification.subject,
                message=notification.message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[notification.recipient.email],
                fail_silently=False,
            )
        notification.status = Notification.NotificationStatus.SENT
        notification.save()
    except Exception as e:
        notification = Notification.objects.get(id=notification_id)
        notification.status = Notification.NotificationStatus.FAILED
        notification.save()
        raise e
