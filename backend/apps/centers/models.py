from django.db import models
from django.core.validators import RegexValidator
from django.conf import settings
from django.db.models import Count, Q
from apps.accounts.models import User


class Center(models.Model):
    class Status(models.TextChoices):
        ACTIVE = 'active', 'সক্রিয়'
        SUSPENDED = 'suspended', 'স্থগিত'

    code = models.CharField(
        max_length=20,
        unique=True,
        verbose_name='কেন্দ্র কোড',
        help_text='যেমন: DHAKA_TCU, CHITT_TCU',
    )
    name_bn = models.CharField(max_length=255, verbose_name='কেন্দ্রের নাম (বাংলায়)')
    name_en = models.CharField(max_length=255, verbose_name='কেন্দ্রের নাম (ইংরেজিতে)')
    short_name_bn = models.CharField(max_length=50, blank=True, verbose_name='সংক্ষিপ্ত নাম (বাংলায়)')
    logo_url = models.URLField(blank=True, verbose_name='লোগো URL')
    address = models.TextField(verbose_name='ঠিকানা')
    phone = models.CharField(
        max_length=15,
        verbose_name='ফোন নম্বর',
    )
    email = models.EmailField(blank=True, verbose_name='ইমেইল')
    website_url = models.URLField(blank=True, verbose_name='ওয়েবসাইট')
    contact_person_name = models.CharField(max_length=255, blank=True, verbose_name='যোগাযোগ ব্যক্তির নাম')
    contact_person_phone = models.CharField(
        max_length=15,
        blank=True,
        verbose_name='যোগাযোগ ব্যক্তির মোবাইল',
    )
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.ACTIVE,
        verbose_name='অবস্থা',
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='তৈরির তারিখ')

    class Meta:
        verbose_name = 'প্রশিক্ষণ কেন্দ্র'
        verbose_name_plural = 'প্রশিক্ষণ কেন্দ্রসমূহ'
        ordering = ('name_en',)

    def __str__(self):
        return f'{self.name_bn} ({self.code})'

    def get_trainee_count(self):
        return self.trainee_set.count()

    def get_active_batch_count(self):
        return self.batch_set.filter(status__in=['running', 'active']).count()

    def get_attendance_rate(self):
        from apps.attendance.models import AttendanceSummary
        result = AttendanceSummary.objects.filter(
            batch__center=self,
        ).aggregate(avg_rate=models.Avg('attendance_percentage'))
        return round(result['avg_rate'], 1) if result['avg_rate'] else 0

    def get_placement_rate(self):
        from apps.jobplacement.models import JobPlacement
        total = self.trainee_set.count()
        placed = JobPlacement.objects.filter(batch__center=self).values('trainee').distinct().count()
        return round((placed / total * 100), 1) if total else 0


class Infrastructure(models.Model):
    class Status(models.TextChoices):
        AVAILABLE = 'available', 'উপলব্ধ'
        UNAVAILABLE = 'unavailable', 'অনুপলব্ধ'
        MAINTENANCE = 'maintenance', 'রক্ষণাবেক্ষণাধীন'

    center = models.ForeignKey(
        Center,
        on_delete=models.CASCADE,
        related_name='infrastructures',
        verbose_name='প্রশিক্ষণ কেন্দ্র',
    )
    room_no = models.CharField(max_length=50, verbose_name='কক্ষ নম্বর')
    location_bn = models.CharField(max_length=255, verbose_name='অবস্থান (বাংলায়)')
    location_en = models.CharField(max_length=255, verbose_name='অবস্থান (ইংরেজিতে)')
    capacity = models.PositiveIntegerField(default=0, verbose_name='ধারণক্ষমতা')
    equipment = models.TextField(blank=True, verbose_name='সরঞ্জাম')
    status = models.CharField(
        max_length=15,
        choices=Status.choices,
        default=Status.AVAILABLE,
        verbose_name='অবস্থা',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'অবকাঠামো'
        verbose_name_plural = 'অবকাঠামো'
        unique_together = ('center', 'room_no')
        ordering = ('center', 'room_no')

    def __str__(self):
        return f'{self.center.code} - {self.room_no}'


class Employee(models.Model):
    class Status(models.TextChoices):
        ACTIVE = 'active', 'সক্রিয়'
        INACTIVE = 'inactive', 'নিষ্ক্রিয়'
        TRANSFERRED = 'transferred', 'বদলি'

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='center_employee',
        verbose_name='ব্যবহারকারী',
    )
    employee_no = models.CharField(
        max_length=30,
        unique=True,
        verbose_name='কর্মচারী নং',
    )
    center = models.ForeignKey(
        Center,
        on_delete=models.CASCADE,
        related_name='employees',
        verbose_name='প্রশিক্ষণ কেন্দ্র',
    )
    designation_bn = models.CharField(max_length=255, verbose_name='পদবী (বাংলায়)')
    designation_en = models.CharField(max_length=255, verbose_name='পদবী (ইংরেজিতে)')
    joining_date = models.DateField(verbose_name='যোগদানের তারিখ')
    is_contact_person = models.BooleanField(default=False, verbose_name='যোগাযোগ ব্যক্তি')
    status = models.CharField(
        max_length=15,
        choices=Status.choices,
        default=Status.ACTIVE,
        verbose_name='অবস্থা',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'কর্মচারী'
        verbose_name_plural = 'কর্মচারীগণ'
        ordering = ('center', 'employee_no')

    def __str__(self):
        return f'{self.employee_no} - {self.user.full_name_bn}'


class ActionLog(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, verbose_name='ব্যবহারকারী',
    )
    action = models.CharField(max_length=100, verbose_name='কর্ম')
    target_type = models.CharField(max_length=50, blank=True, verbose_name='লক্ষ্যের ধরন')
    target_id = models.CharField(max_length=20, blank=True, verbose_name='লক্ষ্যের আইডি')
    description = models.TextField(blank=True, verbose_name='বিবরণ')
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = 'কার্যক্রম লগ'
        verbose_name_plural = 'কার্যক্রম লগ'
        ordering = ('-created_at',)

    def __str__(self):
        return f'{self.user} - {self.action} ({self.created_at:%Y-%m-%d %H:%M})'
