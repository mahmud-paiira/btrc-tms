from django.db import models
from ckeditor.fields import RichTextField
from apps.accounts.models import User


class Course(models.Model):
    class CourseType(models.TextChoices):
        DRIVER = 'driver', 'ড্রাইভার'
        MECHANIC = 'mechanic', 'মেকানিক'
        SUPERVISOR = 'supervisor', 'সুপারভাইজার'

    class Term(models.TextChoices):
        FOUNDATION = 'foundation', 'ফাউন্ডেশন'
        ADVANCED = 'advanced', 'এডভান্সড'

    class Session(models.TextChoices):
        MORNING = 'morning', 'সকাল'
        DAY = 'day', 'দিন'
        EVENING = 'evening', 'সন্ধ্যা'

    class Status(models.TextChoices):
        DRAFT = 'draft', 'খসড়া'
        ACTIVE = 'active', 'সক্রিয়'
        COMPLETED = 'completed', 'সমাপ্ত'

    code = models.CharField(
        max_length=20,
        unique=True,
        verbose_name='কোর্স কোড',
        help_text='যেমন: DRV-FND-MRN-001',
    )
    name_bn = models.CharField(max_length=255, verbose_name='কোর্সের নাম (বাংলায়)')
    name_en = models.CharField(max_length=255, verbose_name='কোর্সের নাম (ইংরেজিতে)')
    course_type = models.CharField(
        max_length=20,
        choices=CourseType.choices,
        verbose_name='কোর্সের ধরণ',
    )
    term = models.CharField(
        max_length=20,
        choices=Term.choices,
        verbose_name='টার্ম',
    )
    session = models.CharField(
        max_length=20,
        choices=Session.choices,
        verbose_name='সেশন',
    )
    duration_months = models.PositiveIntegerField(verbose_name='মেয়াদ (মাস)')
    duration_hours = models.PositiveIntegerField(verbose_name='মোট ঘন্টা')
    total_training_days = models.PositiveIntegerField(verbose_name='মোট প্রশিক্ষণ দিন')
    fee = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='কোর্স ফি')
    stipend_eligible = models.BooleanField(default=False, verbose_name='স্টাইপেন্ড উপযোগী')
    employment_eligible = models.BooleanField(default=False, verbose_name='চাকরির উপযোগী')
    unit_cost = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        verbose_name='ইউনিট খরচ',
    )
    total_target = models.PositiveIntegerField(default=0, verbose_name='মোট টার্গেট')
    description = RichTextField(blank=True, verbose_name='বর্ণনা')
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
        verbose_name='অবস্থা',
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_courses',
        verbose_name='তৈরি করেছেন',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'কোর্স'
        verbose_name_plural = 'কোর্সসমূহ'
        ordering = ('-created_at',)

    def __str__(self):
        return f'{self.name_bn} ({self.code})'


class CourseConfiguration(models.Model):
    course = models.OneToOneField(
        Course,
        on_delete=models.CASCADE,
        related_name='configuration',
        verbose_name='কোর্স',
    )
    eligibility_criteria = RichTextField(blank=True, verbose_name='যোগ্যতার মানদণ্ড')
    training_methodology = RichTextField(blank=True, verbose_name='প্রশিক্ষণ পদ্ধতি')
    assessment_criteria = RichTextField(blank=True, verbose_name='মূল্যায়নের মানদণ্ড')
    passing_marks = models.PositiveIntegerField(default=80, verbose_name='পাস মার্কস (%)')
    attendance_requirement = models.PositiveIntegerField(default=80, verbose_name='উপস্থিতির প্রয়োজন (%)')
    certificate_template = models.CharField(
        max_length=255,
        blank=True,
        verbose_name='সার্টিফিকেট টেমপ্লেট',
    )

    class Meta:
        verbose_name = 'কোর্স কনফিগারেশন'
        verbose_name_plural = 'কোর্স কনফিগারেশন'

    def __str__(self):
        return f'{self.course.code} - কনফিগারেশন'


class CourseBill(models.Model):
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name='bills',
        verbose_name='কোর্স',
    )
    bill_item_bn = models.CharField(max_length=255, verbose_name='বিল আইটেম (বাংলায়)')
    bill_item_en = models.CharField(max_length=255, verbose_name='বিল আইটেম (ইংরেজিতে)')
    amount = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='পরিমাণ')
    is_mandatory = models.BooleanField(default=True, verbose_name='বাধ্যতামূলক')

    class Meta:
        verbose_name = 'কোর্স বিল'
        verbose_name_plural = 'কোর্স বিলসমূহ'
        ordering = ('course', 'bill_item_en')

    def __str__(self):
        return f'{self.course.code} - {self.bill_item_bn} ({self.amount})'


class CourseChapter(models.Model):
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name='chapters',
        verbose_name='কোর্স',
    )
    chapter_no = models.PositiveIntegerField(verbose_name='অধ্যায় নম্বর')
    title_bn = models.CharField(max_length=255, verbose_name='শিরোনাম (বাংলায়)')
    title_en = models.CharField(max_length=255, verbose_name='শিরোনাম (ইংরেজিতে)')
    duration_hours = models.DecimalField(
        max_digits=6, decimal_places=2,
        verbose_name='সময় (ঘন্টা)',
    )

    class Meta:
        verbose_name = 'কোর্স অধ্যায়'
        verbose_name_plural = 'কোর্স অধ্যায়সমূহ'
        ordering = ('course', 'chapter_no')
        unique_together = ('course', 'chapter_no')

    def __str__(self):
        return f'{self.course.code} - অধ্যায় {self.chapter_no}: {self.title_bn}'


class UnitOfCompetency(models.Model):
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name='competencies',
        verbose_name='কোর্স',
    )
    code = models.CharField(max_length=30, verbose_name='কম্পিটেন্সি কোড')
    name_bn = models.CharField(max_length=255, verbose_name='নাম (বাংলায়)')
    name_en = models.CharField(max_length=255, verbose_name='নাম (ইংরেজিতে)')
    assessment_method = models.CharField(
        max_length=255,
        blank=True,
        verbose_name='মূল্যায়ন পদ্ধতি',
    )

    class Meta:
        verbose_name = 'কম্পিটেন্সি ইউনিট'
        verbose_name_plural = 'কম্পিটেন্সি ইউনিটসমূহ'
        ordering = ('course', 'code')
        unique_together = ('course', 'code')

    def __str__(self):
        return f'{self.course.code} - {self.code}: {self.name_bn}'
