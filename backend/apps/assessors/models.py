from django.db import models
from apps.accounts.models import User
from apps.centers.models import Center
from apps.courses.models import Course


class Assessor(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'বিচারাধীন'
        ACTIVE = 'active', 'সক্রিয়'
        SUSPENDED = 'suspended', 'স্থগিত'

    class ApprovalStatus(models.TextChoices):
        PENDING = 'pending', 'অনুমোদিত হয়নি'
        APPROVED = 'approved', 'অনুমোদিত'
        REJECTED = 'rejected', 'বাতিল'

    user = models.OneToOneField(
        User, on_delete=models.CASCADE,
        related_name='assessor_profile', verbose_name='ব্যবহারকারী',
    )
    assessor_no = models.CharField(
        max_length=30, unique=True, verbose_name='মূল্যায়নকারী নং',
    )
    nid = models.CharField(
        max_length=17, unique=True, verbose_name='জাতীয় পরিচয়পত্র নং',
    )
    birth_certificate_no = models.CharField(
        max_length=17, blank=True, null=True, verbose_name='জন্ম নিবন্ধন নং',
    )
    date_of_birth = models.DateField(verbose_name='জন্ম তারিখ')
    father_name_bn = models.CharField(max_length=255, verbose_name='পিতার নাম (বাংলায়)')
    mother_name_bn = models.CharField(max_length=255, verbose_name='মাতার নাম (বাংলায়)')
    education_qualification = models.TextField(verbose_name='শিক্ষাগত যোগ্যতা')
    years_of_experience = models.PositiveIntegerField(default=0, verbose_name='অভিজ্ঞতা (বছর)')
    expertise_area = models.CharField(max_length=255, verbose_name='দক্ষতার ক্ষেত্র')
    certification = models.TextField(blank=True, verbose_name='সার্টিফিকেশন')
    bank_account_no = models.CharField(max_length=30, blank=True, verbose_name='ব্যাংক একাউন্ট নং')
    bank_name = models.CharField(max_length=255, blank=True, verbose_name='ব্যাংকের নাম')
    status = models.CharField(
        max_length=15, choices=Status.choices,
        default=Status.PENDING, verbose_name='অবস্থা',
    )
    approval_status = models.CharField(
        max_length=15, choices=ApprovalStatus.choices,
        default=ApprovalStatus.PENDING, verbose_name='অনুমোদনের অবস্থা',
    )
    approved_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='approved_assessors', verbose_name='অনুমোদনকারী',
    )
    approved_at = models.DateTimeField(null=True, blank=True, verbose_name='অনুমোদনের তারিখ')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'মূল্যায়নকারী'
        verbose_name_plural = 'মূল্যায়নকারীগণ'
        ordering = ('-created_at',)

    def __str__(self):
        return f'{self.assessor_no} - {self.user.full_name_bn}'


class AssessorMapping(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'বিচারাধীন'
        ACTIVE = 'active', 'সক্রিয়'
        SUSPENDED = 'suspended', 'স্থগিত'

    assessor = models.ForeignKey(
        Assessor, on_delete=models.CASCADE,
        related_name='mappings', verbose_name='মূল্যায়নকারী',
    )
    center = models.ForeignKey(
        Center, on_delete=models.CASCADE,
        related_name='assessor_mappings', verbose_name='কেন্দ্র',
    )
    course = models.ForeignKey(
        Course, on_delete=models.CASCADE,
        related_name='assessor_mappings', verbose_name='কোর্স',
    )
    is_primary = models.BooleanField(default=False, verbose_name='প্রাথমিক')
    status = models.CharField(
        max_length=15, choices=Status.choices,
        default=Status.PENDING, verbose_name='অবস্থা',
    )
    approved_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='approved_assessor_mappings', verbose_name='অনুমোদনকারী',
    )
    approved_at = models.DateTimeField(null=True, blank=True, verbose_name='অনুমোদনের তারিখ')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'মূল্যায়নকারী ম্যাপিং'
        verbose_name_plural = 'মূল্যায়নকারী ম্যাপিং'
        unique_together = ('assessor', 'center', 'course')
        ordering = ('assessor', 'center')

    def __str__(self):
        return f'{self.assessor.assessor_no} → {self.center.code} / {self.course.code}'


class TrainerAssessorLink(models.Model):
    trainer = models.ForeignKey(
        'trainers.Trainer', on_delete=models.CASCADE,
        related_name='assessor_links', verbose_name='প্রশিক্ষক',
    )
    assessor = models.OneToOneField(
        Assessor, on_delete=models.CASCADE,
        related_name='trainer_link', verbose_name='মূল্যায়নকারী',
    )
    converted_at = models.DateTimeField(auto_now_add=True, verbose_name='রূপান্তরের তারিখ')
    converted_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        verbose_name='রূপান্তরকারী',
    )
    remarks = models.TextField(blank=True, verbose_name='মন্তব্য')

    class Meta:
        verbose_name = 'প্রশিক্ষক-মূল্যায়নকারী লিংক'
        verbose_name_plural = 'প্রশিক্ষক-মূল্যায়নকারী লিংক'

    def __str__(self):
        return f'{self.trainer.trainer_no} ↔ {self.assessor.assessor_no}'
