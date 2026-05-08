import logging
import secrets
import string

from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.accounts.models import UserProfile

logger = logging.getLogger(__name__)

User = get_user_model()


class EnrollmentAuditLog(models.Model):
    class Result(models.TextChoices):
        SUCCESS = 'success', 'Success'
        USER_EXISTS = 'user_exists', 'User Already Exists'
        FAILED = 'failed', 'Failed'

    application_no = models.CharField(max_length=20, db_index=True, verbose_name='আবেদন নম্বর')
    trainee_registration_no = models.CharField(max_length=30, blank=True, verbose_name='রেজিস্ট্রেশন নম্বর')
    user_email = models.EmailField(blank=True, verbose_name='ব্যবহারকারীর ইমেইল')
    result = models.CharField(
        max_length=20, choices=Result.choices,
        default=Result.FAILED, verbose_name='ফলাফল',
    )
    error_message = models.TextField(blank=True, verbose_name='ত্রুটির বিবরণ')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'এনরোলমেন্ট অডিট লগ'
        verbose_name_plural = 'এনরোলমেন্ট অডিট লগ'
        ordering = ('-created_at',)

    def __str__(self):
        return f'{self.application_no} - {self.result}'


def generate_random_password(length=12):
    chars = string.ascii_letters + string.digits + '!@#$%&*'
    return ''.join(secrets.choice(chars) for _ in range(length))


def create_trainee_from_application(application):
    from .models import Trainee

    email = (
        application.email
        or f'trainee{application.application_no.lower().replace("-", "")}@brtc.gov.bd'
    )
    password = generate_random_password()
    username = email.split('@')[0][:30]

    user, created = User.objects.get_or_create(
        nid=application.nid,
        defaults={
            'email': email,
            'username': username,
            'full_name_bn': application.name_bn,
            'full_name_en': application.name_en or application.name_bn,
            'phone': application.phone,
            'user_type': User.UserType.TRAINEE,
            'center': application.circular.center,
            'is_active': True,
        },
    )

    if created:
        user.set_password(password)
        user.save(update_fields=['password'])

    UserProfile.objects.get_or_create(
        user=user,
        defaults={
            'father_name_bn': application.father_name_bn,
            'mother_name_bn': application.mother_name_bn,
            'present_address': application.present_address,
            'permanent_address': application.permanent_address or application.present_address,
            'date_of_birth': application.date_of_birth,
        },
    )

    trainee, _ = Trainee.objects.get_or_create(
        user=user,
        defaults={
            'application': application,
            'center': application.circular.center,
            'bank_account_no': '',
            'bank_name': '',
            'bank_branch': '',
            'nominee_name': '',
            'nominee_relation': '',
            'nominee_phone': '',
        },
    )

    application.user = user
    application.save(update_fields=['user'])

    if created:
        _send_welcome_email(email, password, application)
        _send_welcome_sms(application.phone, password, application)

    return trainee, created


def _send_welcome_email(email, password, application):
    try:
        subject = 'BRTC প্রশিক্ষণে নির্বাচিত - লগইন তথ্য'
        message = (
            f'প্রিয় {application.name_bn},\n\n'
            f'আপনি {application.circular.title_bn} কোর্সের জন্য নির্বাচিত হয়েছেন।\n\n'
            f'আপনার লগইন তথ্য:\n'
            f'ইমেইল: {email}\n'
            f'পাসওয়ার্ড: {password}\n\n'
            f'লগইন করুন: {getattr(settings, "FRONTEND_URL", "http://localhost:5173")}/login\n\n'
            f'প্রবেশের পর আপনার পাসওয়ার্ড পরিবর্তন করুন।\n\n'
            f'ধন্যবাদ\nবাংলাদেশ টেকনিক্যাল ট্রেনিং সেন্টার'
        )

        if application.email:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[application.email],
                fail_silently=True,
            )
            logger.info(f'Welcome email sent to {email}')

    except Exception as e:
        logger.error(f'Failed to send welcome email to {email}: {e}')


def _send_welcome_sms(phone, password, application):
    try:
        sms_backend_path = getattr(settings, 'SMS_BACKEND', None)
        if not sms_backend_path:
            logger.info(f'SMS not configured. Would send to {phone}')
            return

        import importlib
        module_path, _, class_name = sms_backend_path.rpartition('.')
        module = importlib.import_module(module_path)
        backend_class = getattr(module, class_name)
        backend = backend_class()

        message = (
            f'BRTC: আপনি {application.circular.title_bn} কোর্সের জন্য নির্বাচিত। '
            f'লগইন: {getattr(settings, "FRONTEND_URL", "http://localhost:5173")}/login | '
            f'পাস: {password}'
        )
        backend.send(phone, message)
        logger.info(f'Welcome SMS sent to {phone}')

    except Exception as e:
        logger.error(f'Failed to send welcome SMS to {phone}: {e}')
