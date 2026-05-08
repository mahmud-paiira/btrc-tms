from datetime import date, timedelta

from django.db import models
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from apps.accounts.models import User
from apps.centers.models import Center
from apps.circulars.models import Circular
from apps.courses.models import Course
from apps.trainers.models import Trainer


def generate_batch_no():
    from django.db.models import Max
    year = date.today().year
    prefix = f'BATCH-{year}-'
    last = Batch.objects.filter(
        batch_no__startswith=prefix
    ).aggregate(Max('batch_no'))['batch_no__max']
    if last:
        try:
            last_num = int(last.split('-')[-1])
            new_num = last_num + 1
        except (ValueError, IndexError):
            new_num = 1
    else:
        new_num = 1
    return f'{prefix}{new_num:05d}'


class Batch(models.Model):
    class BatchStatus(models.TextChoices):
        SCHEDULED = 'scheduled', 'নির্ধারিত'
        RUNNING = 'running', 'চলমান'
        COMPLETED = 'completed', 'সমাপ্ত'
        CANCELLED = 'cancelled', 'বাতিল'

    batch_no = models.CharField(
        max_length=30, unique=True, editable=False,
        verbose_name='ব্যাচ নম্বর',
    )
    custom_batch_no = models.CharField(
        max_length=50, blank=True, verbose_name='কাস্টম ব্যাচ নম্বর',
        help_text='ঐচ্ছিক: নিজস্ব ব্যাচ নম্বর দিলে এখানে দিন',
    )
    circular = models.ForeignKey(
        Circular, on_delete=models.CASCADE,
        related_name='batches', verbose_name='সার্কুলার',
    )
    center = models.ForeignKey(
        Center, on_delete=models.CASCADE,
        related_name='batches', verbose_name='প্রশিক্ষণ কেন্দ্র',
    )
    course = models.ForeignKey(
        Course, on_delete=models.CASCADE,
        related_name='batches', verbose_name='কোর্স',
    )
    batch_name_bn = models.CharField(max_length=255, verbose_name='ব্যাচের নাম (বাংলায়)')
    batch_name_en = models.CharField(max_length=255, verbose_name='ব্যাচের নাম (ইংরেজিতে)')
    start_date = models.DateField(verbose_name='শুরুর তারিখ')
    end_date = models.DateField(verbose_name='শেষের তারিখ')
    total_seats = models.PositiveIntegerField(verbose_name='মোট আসন')
    filled_seats = models.PositiveIntegerField(default=0, verbose_name='পূরণকৃত আসন')
    waitlist_seats = models.PositiveIntegerField(default=0, verbose_name='অপেক্ষমাণ আসন')
    status = models.CharField(
        max_length=20, choices=BatchStatus.choices,
        default=BatchStatus.SCHEDULED, verbose_name='অবস্থা',
    )
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='created_batches', verbose_name='তৈরি করেছেন',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'ব্যাচ'
        verbose_name_plural = 'ব্যাচসমূহ'
        ordering = ('-start_date',)
        indexes = [
            models.Index(fields=['center', 'status']),
            models.Index(fields=['circular', 'status']),
        ]

    def clean(self):
        if self.start_date and self.circular_id and self.circular and self.start_date < self.circular.training_start_date:
            raise ValidationError({
                'start_date': f'শুরুর তারিখ ({self.start_date}) সার্কুলারের প্রশিক্ষণ শুরুর তারিখ '
                              f'({self.circular.training_start_date}) এর পূর্বে হতে পারবে না।'
            })
        if self.start_date and self.end_date and self.start_date > self.end_date:
            raise ValidationError({
                'end_date': 'শেষের তারিখ শুরুর তারিখের পরে হতে হবে।'
            })
        if self.total_seats and self.filled_seats and self.filled_seats > self.total_seats:
            raise ValidationError({
                'filled_seats': 'পূরণকৃত আসন মোট আসনের বেশি হতে পারবে না।'
            })

    def save(self, *args, **kwargs):
        if not self.batch_no:
            self.batch_no = generate_batch_no()
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.batch_no} - {self.batch_name_bn}'


class BatchWeekPlan(models.Model):
    class ClassType(models.TextChoices):
        THEORY = 'theory', 'তত্ত্ব'
        PRACTICAL = 'practical', 'ব্যবহারিক'
        ASSESSMENT = 'assessment', 'মূল্যায়ন'

    class DayOfWeek(models.IntegerChoices):
        SATURDAY = 6, 'শনিবার'
        SUNDAY = 0, 'রবিবার'
        MONDAY = 1, 'সোমবার'
        TUESDAY = 2, 'মঙ্গলবার'
        WEDNESDAY = 3, 'বুধবার'
        THURSDAY = 4, 'বৃহস্পতিবার'
        FRIDAY = 5, 'শুক্রবার'

    batch = models.ForeignKey(
        Batch, on_delete=models.CASCADE,
        related_name='week_plans', verbose_name='ব্যাচ',
    )
    term_no = models.PositiveIntegerField(verbose_name='টার্ম নম্বর')
    term_day = models.PositiveIntegerField(verbose_name='টার্মের দিন')
    session_no = models.PositiveIntegerField(verbose_name='সেশন নম্বর')
    class_type = models.CharField(
        max_length=20, choices=ClassType.choices,
        verbose_name='ক্লাসের ধরণ',
    )
    start_date = models.DateField(verbose_name='শুরুর তারিখ')
    end_date = models.DateField(verbose_name='শেষের তারিখ')
    day_of_week = models.IntegerField(
        choices=DayOfWeek.choices,
        verbose_name='বার',
    )
    start_time = models.TimeField(verbose_name='শুরুর সময়')
    end_time = models.TimeField(verbose_name='শেষের সময়')
    duration_hours = models.DecimalField(
        max_digits=5, decimal_places=2,
        validators=[MinValueValidator(0.5)],
        verbose_name='সময়কাল (ঘন্টা)',
    )
    training_room_bn = models.CharField(
        max_length=255, verbose_name='কক্ষ (বাংলায়)',
    )
    training_room_en = models.CharField(
        max_length=255, verbose_name='কক্ষ (ইংরেজিতে)',
    )
    lead_trainer = models.ForeignKey(
        Trainer, on_delete=models.CASCADE,
        related_name='lead_sessions', verbose_name='প্রধান প্রশিক্ষক',
    )
    associate_trainer = models.ForeignKey(
        Trainer, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='associate_sessions', verbose_name='সহকারী প্রশিক্ষক',
    )
    topic_bn = models.CharField(
        max_length=500, verbose_name='বিষয় (বাংলায়)',
    )
    topic_en = models.CharField(
        max_length=500, blank=True, verbose_name='বিষয় (ইংরেজিতে)',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'ব্যাচ সাপ্তাহিক পরিকল্পনা'
        verbose_name_plural = 'ব্যাচ সাপ্তাহিক পরিকল্পনা'
        ordering = ('batch', 'term_no', 'term_day', 'session_no')
        indexes = [
            models.Index(fields=['batch', 'term_no']),
            models.Index(fields=['lead_trainer', 'day_of_week']),
        ]

    def clean(self):
        errors = {}

        if self.start_date and self.end_date and self.start_date > self.end_date:
            errors['end_date'] = 'শেষের তারিখ শুরুর তারিখের পরে হতে হবে।'

        if self.start_time and self.end_time and self.start_time >= self.end_time:
            errors['end_time'] = 'শেষের সময় শুরুর সময়ের পরে হতে হবে।'

        if self.duration_hours:
            diff = timedelta(
                hours=self.end_time.hour - self.start_time.hour,
                minutes=self.end_time.minute - self.start_time.minute,
            )
            diff_hours = diff.total_seconds() / 3600
            if diff_hours < 0:
                diff_hours += 24
            if abs(float(self.duration_hours) - diff_hours) > 0.25:
                errors['duration_hours'] = (
                    f'সময়কাল ({self.duration_hours} ঘন্টা) শুরুর ও শেষের সময়ের '
                    f'ব্যবধানের ({diff_hours:.2f} ঘন্টা) সাথে মিলছে না।'
                )

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.batch.batch_no} - টার্ম {self.term_no} - দিন {self.term_day} - সেশন {self.session_no}'


class BatchEnrollment(models.Model):
    class EnrollmentStatus(models.TextChoices):
        ACTIVE = 'active', 'সক্রিয়'
        DROPPED = 'dropped', 'বহিষ্কৃত'
        COMPLETED = 'completed', 'সমাপ্ত'

    trainee = models.ForeignKey(
        'trainees.Trainee', on_delete=models.CASCADE,
        related_name='batch_enrollments', verbose_name='প্রশিক্ষণার্থী',
    )
    batch = models.ForeignKey(
        Batch, on_delete=models.CASCADE,
        related_name='enrollments', verbose_name='ব্যাচ',
    )
    enrollment_date = models.DateField(auto_now_add=True, verbose_name='নথিভুক্তির তারিখ')
    status = models.CharField(
        max_length=20, choices=EnrollmentStatus.choices,
        default=EnrollmentStatus.ACTIVE, verbose_name='অবস্থা',
    )
    dropped_date = models.DateField(null=True, blank=True, verbose_name='বহিষ্কারের তারিখ')
    drop_reason = models.TextField(blank=True, verbose_name='বহিষ্কারের কারণ')

    class Meta:
        verbose_name = 'ব্যাচে নথিভুক্তি'
        verbose_name_plural = 'ব্যাচে নথিভুক্তি'
        unique_together = ('trainee', 'batch')
        ordering = ('-enrollment_date',)
        indexes = [
            models.Index(fields=['batch', 'status']),
            models.Index(fields=['trainee']),
        ]

    def clean(self):
        if self.status == self.EnrollmentStatus.DROPPED and not self.dropped_date:
            from django.utils import timezone
            self.dropped_date = timezone.now().date()

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.trainee.registration_no} → {self.batch.batch_no}'
