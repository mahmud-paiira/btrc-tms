from datetime import date

from django.db import models
from django.core.validators import RegexValidator
from apps.accounts.models import User
from apps.applications.models import Application
from apps.centers.models import Center
from apps.batches.models import Batch


def generate_registration_no(center_code):
    from django.db.models import Max
    year = date.today().year
    prefix = f'BRTC-{center_code}-{year}-'
    last = Trainee.objects.filter(
        registration_no__startswith=prefix
    ).aggregate(Max('registration_no'))['registration_no__max']
    if last:
        try:
            last_num = int(last.split('-')[-1])
            new_num = last_num + 1
        except (ValueError, IndexError):
            new_num = 1
    else:
        new_num = 1
    return f'{prefix}{new_num:05d}'


class Trainee(models.Model):
    class TraineeStatus(models.TextChoices):
        ENROLLED = 'enrolled', 'নথিভুক্ত'
        DROPPED = 'dropped', 'বহিষ্কৃত'
        COMPLETED = 'completed', 'সমাপ্ত'
        FAILED = 'failed', 'ব্যর্থ'

    user = models.OneToOneField(
        User, on_delete=models.CASCADE,
        related_name='trainee_profile',
        verbose_name='ব্যবহারকারী',
    )
    application = models.OneToOneField(
        Application, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='trainee_enrollment',
        verbose_name='আবেদন',
    )
    registration_no = models.CharField(
        max_length=30, unique=True, editable=False,
        verbose_name='রেজিস্ট্রেশন নম্বর',
    )
    center = models.ForeignKey(
        Center, on_delete=models.CASCADE,
        related_name='trainees', verbose_name='প্রশিক্ষণ কেন্দ্র',
    )
    batch = models.ForeignKey(
        Batch, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='trainees', verbose_name='ব্যাচ',
    )
    enrollment_date = models.DateField(
        auto_now_add=True, verbose_name='নথিভুক্তির তারিখ',
    )

    # Banking info
    bank_account_no = models.CharField(
        max_length=50, blank=True, verbose_name='ব্যাংক অ্যাকাউন্ট নম্বর',
    )
    bank_name = models.CharField(
        max_length=255, blank=True, verbose_name='ব্যাংকের নাম',
    )
    bank_branch = models.CharField(
        max_length=255, blank=True, verbose_name='ব্যাংক শাখা',
    )

    # Nominee info
    nominee_name = models.CharField(
        max_length=255, blank=True, verbose_name='মনোনীত ব্যক্তির নাম',
    )
    nominee_relation = models.CharField(
        max_length=100, blank=True, verbose_name='মনোনীত ব্যক্তির সম্পর্ক',
    )
    nominee_phone_regex = RegexValidator(
        regex=r'^01\d{9}$',
        message='ফোন নম্বর ১১ ডিজিটের হতে হবে এবং 01 দিয়ে শুরু হতে হবে',
    )
    nominee_phone = models.CharField(
        max_length=11, blank=True, validators=[nominee_phone_regex],
        verbose_name='মনোনীত ব্যক্তির মোবাইল',
    )

    # Status
    status = models.CharField(
        max_length=20, choices=TraineeStatus.choices,
        default=TraineeStatus.ENROLLED, verbose_name='অবস্থা',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'প্রশিক্ষণার্থী'
        verbose_name_plural = 'প্রশিক্ষণার্থীগণ'
        ordering = ('-enrollment_date',)
        indexes = [
            models.Index(fields=['center', 'status']),
            models.Index(fields=['batch']),
        ]

    def save(self, *args, **kwargs):
        if not self.registration_no and self.center:
            self.registration_no = generate_registration_no(self.center.code)
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.registration_no} - {self.user.full_name_bn}'
