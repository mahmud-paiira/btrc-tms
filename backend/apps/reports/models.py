from django.db import models
from apps.accounts.models import User
from apps.centers.models import Center


class Report(models.Model):
    class ReportType(models.TextChoices):
        ATTENDANCE = 'attendance', 'উপস্থিতি প্রতিবেদন'
        ASSESSMENT = 'assessment', 'মূল্যায়ন প্রতিবেদন'
        CERTIFICATE = 'certificate', 'সার্টিফিকেট প্রতিবেদন'
        PLACEMENT = 'placement', 'চাকরি প্রতিবেদন'
        PLACEMENT_TRACKING = 'placement_tracking', 'চাকরি ট্র্যাকিং প্রতিবেদন'
        FINANCIAL = 'financial', 'আর্থিক প্রতিবেদন'
        CENTER_WISE = 'center_wise', 'কেন্দ্রভিত্তিক প্রতিবেদন'
        COURSE_WISE = 'course_wise', 'কোর্সভিত্তিক প্রতিবেদন'
        SUMMARY = 'summary', 'সারসংক্ষেপ'

    title = models.CharField(max_length=255, verbose_name='প্রতিবেদনের শিরোনাম')
    report_type = models.CharField(
        max_length=30, choices=ReportType.choices,
        verbose_name='প্রতিবেদনের ধরণ',
    )
    generated_by = models.ForeignKey(
        User, on_delete=models.CASCADE,
        verbose_name='প্রস্তুতকারী',
    )
    parameters = models.JSONField(
        default=dict, blank=True,
        verbose_name='প্যারামিটার',
    )
    file = models.FileField(
        upload_to='reports/', blank=True,
        verbose_name='ফাইল',
    )
    is_ready = models.BooleanField(default=False, verbose_name='প্রস্তুত')
    task_id = models.CharField(
        max_length=255, blank=True,
        verbose_name='টাস্ক আইডি',
    )
    error_message = models.TextField(
        blank=True, verbose_name='ত্রুটির বিবরণ',
    )
    generated_at = models.DateTimeField(
        null=True, blank=True, verbose_name='প্রস্তুতের তারিখ',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'প্রতিবেদন'
        verbose_name_plural = 'প্রতিবেদনসমূহ'
        ordering = ('-created_at',)
        indexes = [
            models.Index(fields=['report_type', 'is_ready']),
        ]

    def __str__(self):
        return f'{self.get_report_type_display()} - {self.created_at.date()}'


class ScheduledReport(models.Model):
    class Frequency(models.TextChoices):
        DAILY = 'daily', 'প্রতিদিন'
        WEEKLY = 'weekly', 'সাপ্তাহিক'
        MONTHLY = 'monthly', 'মাসিক'

    report_type = models.CharField(max_length=50, verbose_name='প্রতিবেদনের ধরণ')
    title = models.CharField(max_length=255, verbose_name='শিরোনাম')
    frequency = models.CharField(
        max_length=10, choices=Frequency.choices,
        default=Frequency.WEEKLY, verbose_name='ফ্রিকোয়েন্সি',
    )
    recipients = models.TextField(
        verbose_name='ইমেইল প্রাপক', help_text='কমা দিয়ে আলাদা করুন',
    )
    export_format = models.CharField(
        max_length=10, default='pdf',
        verbose_name='এক্সপোর্ট ফরম্যাট',
    )
    centers = models.ManyToManyField(
        Center, blank=True, verbose_name='কেন্দ্র',
    )
    parameters = models.JSONField(default=dict, blank=True, verbose_name='প্যারামিটার')
    is_active = models.BooleanField(default=True, verbose_name='সক্রিয়')
    created_by = models.ForeignKey(
        User, on_delete=models.CASCADE,
        verbose_name='তৈরি করেছেন',
    )
    last_run_at = models.DateTimeField(null=True, blank=True, verbose_name='শেষ চালানোর তারিখ')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'নির্ধারিত প্রতিবেদন'
        verbose_name_plural = 'নির্ধারিত প্রতিবেদনসমূহ'
        ordering = ('-created_at',)

    def __str__(self):
        return f'{self.title} ({self.get_frequency_display()})'
