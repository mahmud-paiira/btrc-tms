from django.db import models
from django.core.exceptions import ValidationError
from apps.accounts.models import User
from apps.batches.models import Batch
from apps.trainees.models import Trainee
from apps.assessors.models import Assessor
from apps.attendance.eligibility import check_trainee_eligibility


class Assessment(models.Model):
    class AssessmentType(models.TextChoices):
        PRE_EVALUATION = 'pre_evaluation', 'পূর্ব-মূল্যায়ন'
        WRITTEN = 'written', 'লিখিত'
        VIVA = 'viva', 'মৌখিক'
        PRACTICAL = 'practical', 'ব্যবহারিক'
        FINAL = 'final', 'চূড়ান্ত'

    class CompetencyStatus(models.TextChoices):
        COMPETENT = 'competent', 'দক্ষ'
        NOT_COMPETENT = 'not_competent', 'অদক্ষ'
        ABSENT = 'absent', 'অনুপস্থিত'

    ASSESSMENT_ORDER = {
        'pre_evaluation': 0,
        'written': 1,
        'viva': 2,
        'practical': 3,
        'final': 4,
    }

    trainee = models.ForeignKey(
        Trainee, on_delete=models.CASCADE,
        related_name='assessments', verbose_name='প্রশিক্ষণার্থী',
    )
    batch = models.ForeignKey(
        Batch, on_delete=models.CASCADE,
        related_name='assessments', verbose_name='ব্যাচ',
    )
    assessor = models.ForeignKey(
        Assessor, on_delete=models.SET_NULL,
        null=True, blank=True, verbose_name='মূল্যায়নকারী',
    )
    assessment_type = models.CharField(
        max_length=20, choices=AssessmentType.choices,
        verbose_name='মূল্যায়নের ধরণ',
    )
    assessment_date = models.DateField(verbose_name='মূল্যায়নের তারিখ')
    competency_status = models.CharField(
        max_length=20, choices=CompetencyStatus.choices,
        verbose_name='দক্ষতার অবস্থা',
    )
    marks_obtained = models.DecimalField(
        max_digits=5, decimal_places=2, verbose_name='প্রাপ্ত নম্বর',
    )
    total_marks = models.DecimalField(
        max_digits=5, decimal_places=2, verbose_name='পূর্ণ নম্বর',
    )
    percentage = models.DecimalField(
        max_digits=5, decimal_places=2, editable=False,
        verbose_name='শতাংশ',
    )
    remarks = models.TextField(blank=True, verbose_name='মন্তব্য')
    assessed_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='assessed_marks', verbose_name='মূল্যায়নকারী ব্যবহারকারী',
    )
    assessed_at = models.DateTimeField(
        auto_now_add=True, verbose_name='মূল্যায়নের সময়',
    )
    is_reassessment = models.BooleanField(
        default=False, verbose_name='পুনর্মূল্যায়ন',
    )

    class Meta:
        verbose_name = 'মূল্যায়ন'
        verbose_name_plural = 'মূল্যায়ন'
        unique_together = ('trainee', 'batch', 'assessment_type', 'is_reassessment')
        ordering = ('-assessment_date',)
        indexes = [
            models.Index(fields=['batch', 'assessment_type']),
            models.Index(fields=['trainee', 'batch']),
            models.Index(fields=['competency_status']),
        ]

    def clean(self):
        errors = {}

        if self.total_marks and self.total_marks <= 0:
            errors['total_marks'] = 'পূর্ণ নম্বর শূন্যের চেয়ে বেশি হতে হবে।'

        if self.marks_obtained is not None and self.total_marks:
            if self.marks_obtained > self.total_marks:
                errors['marks_obtained'] = 'প্রাপ্ত নম্বর পূর্ণ নম্বরের চেয়ে বেশি হতে পারবে না।'

        if self.trainee_id and self.batch_id:
            is_eligible, pct, _ = check_trainee_eligibility(
                self.trainee_id, self.batch_id,
            )
            if not is_eligible:
                errors['trainee'] = (
                    'এই প্রশিক্ষণার্থীর উপস্থিতি ৮০% এর নিচে। '
                    'মূল্যায়নের অনুমতি নেই।'
                )

            if self.assessment_type == 'final':
                prev_types = [t for t in self.AssessmentType.values if t != 'final']
                for atype in prev_types:
                    exists = Assessment.objects.filter(
                        trainee=self.trainee,
                        batch=self.batch,
                        assessment_type=atype,
                        competency_status='competent',
                    ).exclude(pk=self.pk).exists()
                    if not exists:
                        errors['assessment_type'] = (
                            f'চূড়ান্ত মূল্যায়নের পূর্বে "{atype}" মূল্যায়নে দক্ষ '
                            'হওয়া আবশ্যক।'
                        )
                        break

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        if self.total_marks and self.total_marks > 0:
            self.percentage = (self.marks_obtained / self.total_marks) * 100
        else:
            self.percentage = 0
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return (
            f'{self.trainee.registration_no} - '
            f'{self.get_assessment_type_display()} - '
            f'{self.get_competency_status_display()}'
        )


class Reassessment(models.Model):
    original_assessment = models.ForeignKey(
        Assessment, on_delete=models.CASCADE,
        related_name='reassessment_requests', verbose_name='মূল মূল্যায়ন',
    )
    new_assessment = models.ForeignKey(
        Assessment, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='reassessment_of', verbose_name='নতুন মূল্যায়ন',
    )
    reason = models.TextField(verbose_name='পুনর্মূল্যায়নের কারণ')
    requested_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='requested_reassessments', verbose_name='অনুরোধকারী',
    )
    approved_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='approved_reassessments', verbose_name='অনুমোদনকারী',
    )
    created_at = models.DateTimeField(
        auto_now_add=True, verbose_name='অনুরোধের তারিখ',
    )

    class Meta:
        verbose_name = 'পুনর্মূল্যায়ন'
        verbose_name_plural = 'পুনর্মূল্যায়ন'
        ordering = ('-created_at',)

    def __str__(self):
        return f'{self.original_assessment} → পুনর্মূল্যায়ন'
