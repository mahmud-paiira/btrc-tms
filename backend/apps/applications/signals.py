import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.mail import send_mail
from django.conf import settings
from .models import Application

logger = logging.getLogger(__name__)


def send_application_email(application):
    if not application.email:
        return
    subject = 'আবেদন প্রাপ্তির নিশ্চিতকরণ'
    message = (
        f'প্রিয় {application.name_bn},\n\n'
        f'আপনার আবেদন নম্বর: {application.application_no}\n'
        f'সার্কুলার: {application.circular.title_bn}\n'
        f'আবেদনের তারিখ: {application.applied_at.strftime("%d-%m-%Y")}\n\n'
        f'আপনার আবেদনটি গৃহীত হয়েছে। পরবর্তী কার্যক্রম সম্পর্কে অবহিত করা হবে।\n\n'
        f'ধন্যবাদ\nবাংলাদেশ টেকনিক্যাল ট্রেনিং সেন্টার'
    )
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[application.email],
            fail_silently=True,
        )
    except Exception as e:
        logger.error(f'Failed to send confirmation email to {application.email}: {e}')


@receiver(post_save, sender=Application)
def handle_application_submission(sender, instance, created, **kwargs):
    if created:
        send_application_email(instance)
