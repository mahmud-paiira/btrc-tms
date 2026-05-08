from django.db import models
from apps.trainees.models import Trainee
from apps.batches.models import Batch
from apps.trainers.models import Trainer
from apps.accounts.models import User


class Attendance(models.Model):
    class Status(models.TextChoices):
        PRESENT = 'present', 'উপস্থিত'
        LATE = 'late', 'বিলম্বে'
        ABSENT = 'absent', 'অনুপস্থিত'
        LEAVE = 'leave', 'ছুটি'

    trainee = models.ForeignKey(
        Trainee, on_delete=models.CASCADE,
        related_name='attendances', verbose_name='প্রশিক্ষণার্থী',
    )
    batch = models.ForeignKey(
        Batch, on_delete=models.CASCADE,
        related_name='attendances', verbose_name='ব্যাচ',
    )
    session_date = models.DateField(verbose_name='সেশনের তারিখ')
    session_no = models.PositiveIntegerField(verbose_name='সেশন নম্বর')
    status = models.CharField(
        max_length=10, choices=Status.choices,
        default=Status.PRESENT, verbose_name='অবস্থা',
    )
    lead_trainer = models.ForeignKey(
        Trainer, on_delete=models.CASCADE,
        related_name='attendance_lead', verbose_name='প্রধান প্রশিক্ষক',
    )
    associate_trainer = models.ForeignKey(
        Trainer, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='attendance_associate', verbose_name='সহকারী প্রশিক্ষক',
    )
    guest_trainer_name = models.CharField(
        max_length=255, blank=True,
        verbose_name='অতিথি প্রশিক্ষকের নাম',
    )
    marked_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True,
        related_name='marked_attendances', verbose_name='মার্ক করেছেন',
    )
    marked_at = models.DateTimeField(auto_now_add=True, verbose_name='মার্কের সময়')
    remarks = models.TextField(blank=True, verbose_name='মন্তব্য')

    class Meta:
        verbose_name = 'উপস্থিতি'
        verbose_name_plural = 'উপস্থিতি'
        unique_together = ('trainee', 'batch', 'session_date', 'session_no')
        ordering = ('-session_date', '-session_no')
        indexes = [
            models.Index(fields=['batch', 'session_date']),
            models.Index(fields=['trainee', 'batch']),
            models.Index(fields=['batch', 'status']),
        ]

    def __str__(self):
        return f'{self.trainee.registration_no} - {self.session_date} - {self.get_status_display()}'


class AttendanceSummary(models.Model):
    trainee = models.ForeignKey(
        Trainee, on_delete=models.CASCADE,
        related_name='attendance_summaries', verbose_name='প্রশিক্ষণার্থী',
    )
    batch = models.ForeignKey(
        Batch, on_delete=models.CASCADE,
        related_name='attendance_summaries', verbose_name='ব্যাচ',
    )
    total_sessions = models.PositiveIntegerField(default=0, verbose_name='মোট সেশন')
    attended_sessions = models.PositiveIntegerField(default=0, verbose_name='উপস্থিত সেশন')
    attendance_percentage = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
        verbose_name='উপস্থিতির হার (%)',
    )

    class Meta:
        verbose_name = 'উপস্থিতি সারাংশ'
        verbose_name_plural = 'উপস্থিতি সারাংশ'
        unique_together = ('trainee', 'batch')
        indexes = [
            models.Index(fields=['batch', 'attendance_percentage']),
        ]

    def refresh(self):
        from django.db.models import Count, Q
        qs = Attendance.objects.filter(
            trainee=self.trainee, batch=self.batch,
        )
        self.total_sessions = qs.count()
        self.attended_sessions = qs.filter(
            Q(status=Attendance.Status.PRESENT) | Q(status=Attendance.Status.LATE),
        ).count()
        self.attendance_percentage = round(
            (self.attended_sessions / self.total_sessions * 100)
            if self.total_sessions else 0, 2,
        )
        self.save(update_fields=['total_sessions', 'attended_sessions', 'attendance_percentage'])

    def __str__(self):
        return f'{self.trainee.registration_no} - {self.attendance_percentage}%'