from django.db import models
from apps.accounts.models import User
from apps.batches.models import Batch
from apps.trainees.models import Trainee


class CalculationBasis(models.TextChoices):
    PER_SESSION = 'per_session', 'প্রতি সেশন'
    TIERED = 'tiered', 'স্তরভিত্তিক'


class AllowanceCategory(models.Model):
    name_bn = models.CharField(max_length=255, verbose_name='নাম (বাংলায়)')
    name_en = models.CharField(max_length=255, verbose_name='নাম (ইংরেজিতে)')
    amount_per_session = models.DecimalField(
        max_digits=10, decimal_places=2,
        verbose_name='প্রতি সেশনে ভাতা',
    )
    calculation_basis = models.CharField(
        max_length=20, choices=CalculationBasis.choices,
        default=CalculationBasis.PER_SESSION,
        verbose_name='গণনার ধরন',
    )
    is_active = models.BooleanField(default=True, verbose_name='সক্রিয়')
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='created_allowance_categories',
        verbose_name='তৈরি করেছেন',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'ভাতার শ্রেণী'
        verbose_name_plural = 'ভাতার শ্রেণী'

    def __str__(self):
        return self.name_bn


class AllowanceTier(models.Model):
    category = models.ForeignKey(
        AllowanceCategory, on_delete=models.CASCADE,
        related_name='tiers', verbose_name='ভাতার শ্রেণী',
    )
    name_bn = models.CharField(max_length=255, verbose_name='নাম (বাংলায়)')
    name_en = models.CharField(max_length=255, blank=True, verbose_name='নাম (ইংরেজিতে)')
    min_percentage = models.DecimalField(
        max_digits=5, decimal_places=2, verbose_name='ন্যূনতম শতাংশ (%)',
    )
    max_percentage = models.DecimalField(
        max_digits=5, decimal_places=2, verbose_name='সর্বোচ্চ শতাংশ (%)',
    )
    multiplier = models.DecimalField(
        max_digits=5, decimal_places=2, default=1.00,
        verbose_name='গুণক',
    )
    is_active = models.BooleanField(default=True, verbose_name='সক্রিয়')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'ভাতার স্তর'
        verbose_name_plural = 'ভাতার স্তর'
        ordering = ('category', 'min_percentage')

    def __str__(self):
        return f'{self.category.name_bn} - {self.name_bn}'


class TraineeAllowance(models.Model):
    class AllowanceStatus(models.TextChoices):
        CALCULATED = 'calculated', 'গণনাকৃত'
        APPROVED = 'approved', 'অনুমোদিত'
        DISBURSED = 'disbursed', 'বিতরণকৃত'

    trainee = models.ForeignKey(
        Trainee, on_delete=models.CASCADE,
        related_name='allowances', verbose_name='প্রশিক্ষণার্থী',
    )
    batch = models.ForeignKey(
        Batch, on_delete=models.CASCADE,
        related_name='allowances', verbose_name='ব্যাচ',
    )
    category = models.ForeignKey(
        AllowanceCategory, on_delete=models.CASCADE,
        related_name='allowances', verbose_name='ভাতার শ্রেণী',
    )
    total_sessions = models.PositiveIntegerField(default=0, verbose_name='মোট সেশন')
    attended_sessions = models.DecimalField(max_digits=8, decimal_places=2, default=0, verbose_name='উপস্থিত সেশন')
    calculated_amount = models.DecimalField(
        max_digits=10, decimal_places=2,
        default=0, verbose_name='গণনাকৃত অর্থ',
    )
    approved_amount = models.DecimalField(
        max_digits=10, decimal_places=2,
        null=True, blank=True, verbose_name='অনুমোদিত অর্থ',
    )
    status = models.CharField(
        max_length=15, choices=AllowanceStatus.choices,
        default=AllowanceStatus.CALCULATED, verbose_name='অবস্থা',
    )
    approved_by = models.ForeignKey(
        User, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='approved_allowances', verbose_name='অনুমোদনকারী',
    )
    approved_at = models.DateTimeField(null=True, blank=True, verbose_name='অনুমোদনের তারিখ')
    disbursed_by = models.ForeignKey(
        User, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='disbursed_allowances', verbose_name='বিতরণকারী',
    )
    disbursed_at = models.DateTimeField(null=True, blank=True, verbose_name='বিতরণের তারিখ')
    payment_method = models.CharField(
        max_length=20, blank=True, verbose_name='পেমেন্ট পদ্ধতি',
        choices=[
            ('bkash', 'বিকাশ'),
            ('nagad', 'নগদ'),
            ('bank', 'ব্যাংক'),
            ('cash', 'নগদ অর্থ'),
        ],
    )
    transaction_id = models.CharField(max_length=100, blank=True, verbose_name='লেনদেন আইডি')
    disbursement_notes = models.TextField(blank=True, verbose_name='বিতরণ নোট')

    class Meta:
        verbose_name = 'প্রশিক্ষণার্থী ভাতা'
        verbose_name_plural = 'প্রশিক্ষণার্থী ভাতা'
        unique_together = ('trainee', 'batch', 'category')

    def __str__(self):
        return f'{self.trainee.registration_no} - {self.category.name_bn} - {self.calculated_amount}'

    def calculate(self):
        category = self.category
        if category.calculation_basis == 'tiered':
            percentage = (
                (float(self.attended_sessions) / self.total_sessions * 100)
                if self.total_sessions else 0
            )
            tier = category.tiers.filter(
                min_percentage__lte=percentage,
                max_percentage__gte=percentage,
                is_active=True,
            ).first()
            multiplier = tier.multiplier if tier else 1
            self.calculated_amount = (
                float(self.total_sessions) * float(category.amount_per_session) * float(multiplier)
            )
        else:
            self.calculated_amount = float(self.attended_sessions) * float(category.amount_per_session)
        self.calculated_amount = round(self.calculated_amount, 2)
        self.save(update_fields=['calculated_amount'])
