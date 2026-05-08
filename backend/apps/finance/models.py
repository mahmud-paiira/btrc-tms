from django.db import models
from django.core.exceptions import ValidationError
from apps.accounts.models import User
from apps.centers.models import Center
from apps.courses.models import Course


class Budget(models.Model):
    center = models.ForeignKey(
        Center, on_delete=models.CASCADE,
        related_name='budgets', verbose_name='কেন্দ্র',
    )
    fiscal_year = models.CharField(max_length=9, verbose_name='অর্থবছর', help_text='যেমন: ২০২৪-২০২৫')
    course = models.ForeignKey(
        Course, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='budgets', verbose_name='কোর্স (ঐচ্ছিক)',
    )
    allocated_amount = models.DecimalField(max_digits=15, decimal_places=2, verbose_name='বরাদ্দকৃত অর্থ')
    expended_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0, verbose_name='ব্যয়িত অর্থ')
    notes = models.TextField(blank=True, verbose_name='মন্তব্য')
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='created_budgets', verbose_name='তৈরি করেছেন',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'বাজেট'
        verbose_name_plural = 'বাজেট'
        unique_together = ('center', 'fiscal_year', 'course')
        ordering = ('-fiscal_year', 'center')

    def __str__(self):
        return f'{self.center.code} - {self.fiscal_year} - {self.course.code if self.course else "সাধারণ"}'


class Voucher(models.Model):
    class VoucherType(models.TextChoices):
        JOURNAL = 'journal', 'জার্নাল'
        PAYMENT = 'payment', 'পেমেন্ট'
        CONTRA = 'contra', 'কন্ট্রা'

    class VoucherStatus(models.TextChoices):
        DRAFT = 'draft', 'খসড়া'
        VERIFIED = 'verified', 'যাচাইকৃত'
        APPROVED = 'approved', 'অনুমোদিত'

    voucher_no = models.CharField(max_length=30, unique=True, verbose_name='ভাউচার নং')
    voucher_type = models.CharField(
        max_length=10, choices=VoucherType.choices,
        default=VoucherType.JOURNAL, verbose_name='ভাউচারের ধরণ',
    )
    amount = models.DecimalField(max_digits=15, decimal_places=2, verbose_name='মোট অর্থ')
    status = models.CharField(
        max_length=10, choices=VoucherStatus.choices,
        default=VoucherStatus.DRAFT, verbose_name='অবস্থা',
    )
    description = models.TextField(blank=True, verbose_name='বিবরণ')
    center = models.ForeignKey(
        Center, on_delete=models.CASCADE,
        related_name='vouchers', verbose_name='কেন্দ্র', null=True, blank=True,
    )
    voucher_date = models.DateField(verbose_name='ভাউচারের তারিখ')
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='created_vouchers', verbose_name='তৈরি করেছেন',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'ভাউচার'
        verbose_name_plural = 'ভাউচার'
        ordering = ('-voucher_date',)

    def __str__(self):
        return f'{self.voucher_no} ({self.get_voucher_type_display()})'

    def clean(self):
        total_debit = sum(i.debit_amount or 0 for i in self.items.all())
        total_credit = sum(i.credit_amount or 0 for i in self.items.all())
        if abs(total_debit - total_credit) > 0.01:
            raise ValidationError('ডেবিট ও ক্রেডিট এর সমষ্টি সমান হতে হবে')


class VoucherItem(models.Model):
    voucher = models.ForeignKey(
        Voucher, on_delete=models.CASCADE,
        related_name='items', verbose_name='ভাউচার',
    )
    account_head = models.CharField(max_length=255, verbose_name='হিসাব শিরোনাম')
    debit_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0, verbose_name='ডেবিট')
    credit_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0, verbose_name='ক্রেডিট')
    description = models.CharField(max_length=500, blank=True, verbose_name='বিবরণ')

    class Meta:
        verbose_name = 'ভাউচার আইটেম'
        verbose_name_plural = 'ভাউচার আইটেম'

    def __str__(self):
        return f'{self.account_head}: {self.debit_amount or self.credit_amount}'


class MakerCheckerApprover(models.Model):
    voucher = models.OneToOneField(
        Voucher, on_delete=models.CASCADE,
        related_name='workflow', verbose_name='ভাউচার',
    )
    maker = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='maker_vouchers', verbose_name='নির্মাতা',
    )
    checker = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='checker_vouchers', verbose_name='যাচাইকারী',
    )
    approver = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='approver_vouchers', verbose_name='অনুমোদনকারী',
    )
    maker_date = models.DateTimeField(null=True, blank=True, verbose_name='নির্মাণের তারিখ')
    checker_date = models.DateTimeField(null=True, blank=True, verbose_name='যাচাইয়ের তারিখ')
    approver_date = models.DateTimeField(null=True, blank=True, verbose_name='অনুমোদনের তারিখ')

    class Meta:
        verbose_name = 'নির্মাতা-যাচাইকারী-অনুমোদনকারী'
        verbose_name_plural = 'নির্মাতা-যাচাইকারী-অনুমোদনকারী'

    def __str__(self):
        return f'MCA-{self.voucher.voucher_no}'
