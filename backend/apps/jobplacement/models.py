from django.db import models
from django.core.exceptions import ValidationError
from apps.accounts.models import User
from apps.trainees.models import Trainee
from apps.batches.models import Batch


class JobPlacement(models.Model):
    class EmploymentType(models.TextChoices):
        SELF_EMPLOYMENT = 'self_employment', 'স্ব-কর্মসংস্থান'
        WAGES_EMPLOYMENT = 'wages_employment', 'মজুরি-কর্মসংস্থান'
        UP_SKILL_EMPLOYMENT = 'up_skill_employment', 'আপ-স্কিল কর্মসংস্থান'

    trainee = models.ForeignKey(
        Trainee, on_delete=models.CASCADE,
        related_name='job_placements', verbose_name='প্রশিক্ষণার্থী',
    )
    batch = models.ForeignKey(
        Batch, on_delete=models.CASCADE,
        related_name='job_placements', verbose_name='ব্যাচ',
    )
    employment_type = models.CharField(
        max_length=25, choices=EmploymentType.choices,
        verbose_name='কর্মসংস্থানের ধরণ',
    )
    employer_name = models.CharField(
        max_length=255, verbose_name='নিয়োগকর্তার নাম',
    )
    employer_address = models.TextField(
        blank=True, verbose_name='নিয়োগকর্তার ঠিকানা',
    )
    designation_bn = models.CharField(
        max_length=255, verbose_name='পদবী (বাংলায়)',
    )
    designation_en = models.CharField(
        max_length=255, blank=True, verbose_name='পদবী (ইংরেজিতে)',
    )
    salary = models.DecimalField(
        max_digits=12, decimal_places=2, verbose_name='বেতন',
    )
    start_date = models.DateField(verbose_name='শুরুর তারিখ')
    release_date = models.DateField(
        null=True, blank=True, verbose_name='অবমুক্তির তারিখ',
    )
    is_current = models.BooleanField(
        default=True, verbose_name='বর্তমান চাকরি',
    )
    contact_person = models.CharField(
        max_length=255, blank=True, verbose_name='যোগাযোগ ব্যক্তি',
    )
    contact_phone = models.CharField(
        max_length=15, blank=True, verbose_name='যোগাযোগের মোবাইল',
    )
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='job_placements_created', verbose_name='তৈরি করেছেন',
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='তৈরির তারিখ')

    class Meta:
        verbose_name = 'চাকরি স্থাপন'
        verbose_name_plural = 'চাকরি স্থাপন'
        ordering = ('-created_at',)
        indexes = [
            models.Index(fields=['batch', 'is_current']),
            models.Index(fields=['trainee']),
            models.Index(fields=['employment_type']),
        ]

    def clean(self):
        from apps.certificates.models import Certificate
        errors = {}

        if self.release_date and self.start_date and self.release_date < self.start_date:
            errors['release_date'] = 'অবমুক্তির তারিখ শুরুর তারিখের পরে হতে হবে।'

        if self.trainee_id and self.batch_id:
            has_cert = Certificate.objects.filter(
                trainee_id=self.trainee_id,
                batch_id=self.batch_id,
            ).exists()
            if not has_cert:
                errors['trainee'] = (
                    'শুধুমাত্র সার্টিফিকেট প্রাপ্ত প্রশিক্ষণার্থীদের জন্য '
                    'চাকরি স্থাপন যোগ করা যাবে।'
                )

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return (
            f'{self.trainee.registration_no} – '
            f'{self.get_employment_type_display()} – '
            f'{self.employer_name}'
        )


class JobTracking(models.Model):
    class TrackingMonth(models.IntegerChoices):
        THREE = 3, '৩ মাস'
        SIX = 6, '৬ মাস'
        TWELVE = 12, '১২ মাস'

    job_placement = models.ForeignKey(
        JobPlacement, on_delete=models.CASCADE,
        related_name='trackings', verbose_name='চাকরি স্থাপন',
    )
    tracking_month = models.PositiveIntegerField(
        choices=TrackingMonth.choices, verbose_name='ট্র্যাকিং মাস',
    )
    tracking_date = models.DateField(verbose_name='ট্র্যাকিংয়ের তারিখ')
    is_still_employed = models.BooleanField(
        default=True, verbose_name='এখনো কর্মরত',
    )
    salary_changed = models.BooleanField(
        default=False, verbose_name='বেতন পরিবর্তিত',
    )
    new_salary = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
        verbose_name='নতুন বেতন',
    )
    promoted = models.BooleanField(
        default=False, verbose_name='পদোন্নতি',
    )
    new_designation = models.CharField(
        max_length=255, blank=True, verbose_name='নতুন পদবী',
    )
    comments = models.TextField(blank=True, verbose_name='মন্তব্য')
    tracked_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='job_trackings', verbose_name='ট্র্যাকিংকারী',
    )
    tracked_at = models.DateTimeField(
        auto_now_add=True, verbose_name='ট্র্যাকিংয়ের সময়',
    )

    class Meta:
        verbose_name = 'চাকরি ট্র্যাকিং'
        verbose_name_plural = 'চাকরি ট্র্যাকিং'
        unique_together = ('job_placement', 'tracking_month')
        ordering = ('-tracking_date',)
        indexes = [
            models.Index(fields=['job_placement', 'tracking_month']),
        ]

    def clean(self):
        errors = {}
        if self.salary_changed and self.new_salary is None:
            errors['new_salary'] = 'বেতন পরিবর্তিত হলে নতুন বেতন দিতে হবে।'
        if self.promoted and not self.new_designation:
            errors['new_designation'] = 'পদোন্নতি হলে নতুন পদবী দিতে হবে।'
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.job_placement} – {self.get_tracking_month_display()} ট্র্যাকিং'
