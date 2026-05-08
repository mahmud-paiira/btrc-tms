from django.db import models
from apps.accounts.models import User


class Notification(models.Model):
    class NotificationChannel(models.TextChoices):
        EMAIL = 'email', 'ইমেইল'
        SMS = 'sms', 'SMS'
        BOTH = 'both', 'উভয়'

    class NotificationStatus(models.TextChoices):
        PENDING = 'pending', 'অপেক্ষমাণ'
        SENT = 'sent', 'প্রেরিত'
        FAILED = 'failed', 'ব্যর্থ'

    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications',
                                  verbose_name='প্রাপক')
    subject = models.CharField(max_length=255, verbose_name='বিষয়')
    message = models.TextField(verbose_name='বার্তা')
    channel = models.CharField(
        max_length=10, choices=NotificationChannel.choices,
        default=NotificationChannel.EMAIL, verbose_name='চ্যানেল',
    )
    status = models.CharField(
        max_length=10, choices=NotificationStatus.choices,
        default=NotificationStatus.PENDING, verbose_name='অবস্থা',
    )
    sent_at = models.DateTimeField(null=True, blank=True, verbose_name='প্রেরণের সময়')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'বিজ্ঞপ্তি'
        verbose_name_plural = 'বিজ্ঞপ্তিসমূহ'
        ordering = ('-created_at',)

    def __str__(self):
        return f'{self.subject} - {self.recipient.username}'
