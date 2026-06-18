from django.db import models
from django.core.exceptions import ValidationError
from ckeditor.fields import RichTextField
from apps.accounts.models import User


class Gender(models.Model):
    name_bn = models.CharField(max_length=50, unique=True, verbose_name='নাম (বাংলায়)')
    name_en = models.CharField(max_length=50, unique=True, verbose_name='নাম (ইংরেজিতে)')
    order = models.IntegerField(default=0, verbose_name='ক্রম')

    class Meta:
        verbose_name = 'লিঙ্গ'
        verbose_name_plural = 'লিঙ্গ'
        ordering = ('order',)

    def __str__(self):
        return self.name_bn


class Education(models.Model):
    name_bn = models.CharField(max_length=100, unique=True, verbose_name='নাম (বাংলায়)')
    name_en = models.CharField(max_length=100, unique=True, verbose_name='নাম (ইংরেজিতে)')
    rank = models.IntegerField(default=0, verbose_name='ক্রম/স্তর', help_text='শিক্ষাগত স্তর নির্ধারণের জন্য সংখ্যা')
    order = models.IntegerField(default=0, verbose_name='সজ্জা ক্রম')

    class Meta:
        verbose_name = 'শিক্ষাগত যোগ্যতা'
        verbose_name_plural = 'শিক্ষাগত যোগ্যতা'
        ordering = ('order',)

    def __str__(self):
        return self.name_bn


class Demography(models.Model):
    TYPES = (
        ('division', 'বিভাগ'),
        ('district', 'জেলা'),
        ('upazila', 'উপজেলা'),
    )
    name_bn = models.CharField(max_length=100, verbose_name='নাম (বাংলায়)')
    name_en = models.CharField(max_length=100, verbose_name='নাম (ইংরেজিতে)')
    type = models.CharField(max_length=20, choices=TYPES, verbose_name='ধরন')
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='children', verbose_name='প্যারেন্ট')
    bbs_code = models.CharField(max_length=10, blank=True, verbose_name='BBS কোড')

    class Meta:
        verbose_name = 'জনসংখ্যা তথ্য'
        verbose_name_plural = 'জনসংখ্যা তথ্য'
        ordering = ('type', 'name_bn')
        unique_together = ('name_bn', 'type')

    def __str__(self):
        return f'{self.name_bn} ({self.get_type_display()})'


class SystemSetting(models.Model):
    DATA_TYPES = (
        ('string', 'String'),
        ('integer', 'Integer'),
        ('boolean', 'Boolean'),
        ('float', 'Float'),
    )

    key = models.CharField(max_length=100, unique=True, verbose_name='কী')
    value = models.TextField(verbose_name='মান')
    data_type = models.CharField(max_length=20, choices=DATA_TYPES, default='string', verbose_name='ডাটা টাইপ')
    description = models.TextField(blank=True, verbose_name='বিবরণ')
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, verbose_name='হালনাগাদ করেছেন')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='হালনাগাদের সময়')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'সিস্টেম সেটিং'
        verbose_name_plural = 'সিস্টেম সেটিংস'
        ordering = ('key',)

    def __str__(self):
        return f'{self.key} = {self.value}'

    def clean(self):
        if self.data_type == 'integer':
            try:
                int(self.value)
            except (ValueError, TypeError):
                raise ValidationError({'value': 'পূর্ণসংখ্যা হতে হবে'})
        elif self.data_type == 'boolean':
            if self.value.lower() not in ('true', 'false', '1', '0'):
                raise ValidationError({'value': 'true/false হতে হবে'})
        elif self.data_type == 'float':
            try:
                float(self.value)
            except (ValueError, TypeError):
                raise ValidationError({'value': 'দশমিক সংখ্যা হতে হবে'})


class EmailTemplate(models.Model):
    name = models.CharField(max_length=100, unique=True, verbose_name='নাম')
    subject_bn = models.CharField(max_length=255, verbose_name='বিষয় (বাংলা)')
    subject_en = models.CharField(max_length=255, verbose_name='বিষয় (ইংরেজি)')
    body_bn = RichTextField(verbose_name='বডি (বাংলা)')
    body_en = RichTextField(verbose_name='বডি (ইংরেজি)')
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'ইমেইল টেমপ্লেট'
        verbose_name_plural = 'ইমেইল টেমপ্লেট'
        ordering = ('name',)

    def __str__(self):
        return self.name


class SmsTemplate(models.Model):
    name = models.CharField(max_length=100, unique=True, verbose_name='নাম')
    message_bn = models.TextField(verbose_name='বার্তা (বাংলা)')
    message_en = models.TextField(verbose_name='বার্তা (ইংরেজি)')
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'এসএমএস টেমপ্লেট'
        verbose_name_plural = 'এসএমএস টেমপ্লেট'
        ordering = ('name',)

    def __str__(self):
        return self.name


class IntegrationConfig(models.Model):
    PROVIDERS = (
        ('nid_mock', 'NID Mock'),
        ('nid_live', 'NID Live'),
        ('sms_gateway', 'SMS Gateway'),
        ('payment_bkash', 'bKash'),
        ('payment_nagad', 'Nagad'),
        ('payment_rocket', 'Rocket'),
        ('email_smtp', 'SMTP Email'),
    )

    name = models.CharField(max_length=100, unique=True, verbose_name='নাম')
    provider = models.CharField(max_length=50, choices=PROVIDERS, verbose_name='প্রোভাইডার')
    settings = models.JSONField(default=dict, blank=True, verbose_name='সেটিংস')
    is_active = models.BooleanField(default=True, verbose_name='সক্রিয়')
    last_test_at = models.DateTimeField(null=True, blank=True, verbose_name='সর্বশেষ টেস্ট')
    last_test_status = models.CharField(max_length=20, blank=True, verbose_name='সর্বশেষ টেস্ট অবস্থা')
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, verbose_name='হালনাগাদ করেছেন')
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'ইন্টিগ্রেশন কনফিগারেশন'
        verbose_name_plural = 'ইন্টিগ্রেশন কনফিগারেশন'
        ordering = ('name',)

    def __str__(self):
        return f'{self.name} ({self.get_provider_display()})'


class BackupConfig(models.Model):
    schedule = models.CharField(max_length=20, default='02:00', verbose_name='সময়সূচী', help_text='HH:MM ফরম্যাটে')
    retention_days = models.IntegerField(default=30, verbose_name='সংরক্ষণ দিন')
    storage_path = models.CharField(max_length=500, default='backups/', verbose_name='স্টোরেজ পাথ')
    last_backup_at = models.DateTimeField(null=True, blank=True, verbose_name='সর্বশেষ ব্যাকআপ')
    is_active = models.BooleanField(default=True, verbose_name='সক্রিয়')
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'ব্যাকআপ কনফিগারেশন'
        verbose_name_plural = 'ব্যাকআপ কনফিগারেশন'

    def __str__(self):
        return f'Backup @ {self.schedule} ({"" if self.is_active else "in"}active)'
