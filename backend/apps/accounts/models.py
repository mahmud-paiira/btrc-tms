from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.utils import timezone
from django.core.validators import MinLengthValidator, MaxLengthValidator
from .managers import UserManager


class Role(models.Model):
    name = models.CharField(max_length=100, unique=True, verbose_name='ভূমিকার নাম')
    description = models.TextField(blank=True, verbose_name='বিবরণ')
    permissions = models.JSONField(default=list, blank=True, verbose_name='অনুমতি')
    is_system = models.BooleanField(default=False, verbose_name='সিস্টেম ভূমিকা')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'ভূমিকা'
        verbose_name_plural = 'ভূমিকাসমূহ'
        ordering = ('name',)

    def __str__(self):
        return self.name


class LoginLog(models.Model):
    user = models.ForeignKey(
        'accounts.User', on_delete=models.CASCADE,
        related_name='login_logs', verbose_name='ব্যবহারকারী',
    )
    ip_address = models.GenericIPAddressField(blank=True, null=True, verbose_name='আইপি ঠিকানা')
    user_agent = models.TextField(blank=True, verbose_name='ইউজার এজেন্ট')
    login_time = models.DateTimeField(default=timezone.now, verbose_name='লগইনের সময়')
    is_success = models.BooleanField(default=True, verbose_name='সফল')

    class Meta:
        verbose_name = 'লগইন লগ'
        verbose_name_plural = 'লগইন লগ'
        ordering = ('-login_time',)

    def __str__(self):
        status = 'সফল' if self.is_success else 'ব্যর্থ'
        return f'{self.user.email} - {status} - {self.login_time}'


class User(AbstractBaseUser, PermissionsMixin):
    class UserType(models.TextChoices):
        HEAD_OFFICE = 'head_office', 'হেড অফিস'
        CENTER_ADMIN = 'center_admin', 'কেন্দ্র প্রশাসক'
        TRAINER = 'trainer', 'প্রশিক্ষক'
        ASSESSOR = 'assessor', 'মূল্যায়নকারী'
        TRAINEE = 'trainee', 'প্রশিক্ষণার্থী'

    email = models.EmailField(
        unique=True,
        verbose_name='ইমেইল',
        help_text='লগইনের জন্য ব্যবহার করা হবে',
    )
    username = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        verbose_name='ব্যবহারকারীর নাম',
    )
    user_type = models.CharField(
        max_length=20,
        choices=UserType.choices,
        default=UserType.TRAINEE,
        verbose_name='ব্যবহারকারীর ধরণ',
    )
    center = models.ForeignKey(
        'centers.Center',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name='প্রশিক্ষণ কেন্দ্র',
        help_text='হেড অফিসের জন্য খালি রাখুন',
    )
    role = models.ForeignKey(
        Role, on_delete=models.SET_NULL,
        null=True, blank=True,
        verbose_name='ভূমিকা',
    )
    full_name_bn = models.CharField(
        max_length=255,
        verbose_name='নাম (বাংলায়)',
        help_text='নিকোশ ফন্টে বাংলায় নাম লিখুন',
    )
    full_name_en = models.CharField(
        max_length=255,
        verbose_name='নাম (ইংরেজিতে)',
    )
    phone = models.CharField(
        max_length=11,
        unique=True,
        validators=[MinLengthValidator(11), MaxLengthValidator(11)],
        verbose_name='মোবাইল নম্বর',
        help_text='১১ ডিজিটের মোবাইল নম্বর',
    )
    nid = models.CharField(
        max_length=17,
        unique=True,
        verbose_name='জাতীয় পরিচয়পত্র নং',
        help_text='১০ বা ১৭ ডিজিটের এনআইডি',
    )
    birth_certificate_no = models.CharField(
        max_length=17,
        blank=True,
        null=True,
        verbose_name='জন্ম নিবন্ধন নং',
        help_text='১৭ ডিজিটের জন্ম নিবন্ধন নম্বর (ঐচ্ছিক)',
    )
    profile_image = models.ImageField(
        upload_to='users/profiles/',
        blank=True,
        verbose_name='প্রোফাইল ছবি',
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name='সক্রিয়',
    )
    mfa_secret = models.CharField(
        max_length=64,
        blank=True,
        null=True,
        verbose_name='MFA সিক্রেট',
        help_text='টু-ফ্যাক্টর অথেনটিকেশনের জন্য সিক্রেট কী',
    )
    last_login = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='সর্বশেষ লগইন',
    )
    created_at = models.DateTimeField(
        default=timezone.now,
        verbose_name='তৈরির তারিখ',
    )

    # Django admin required fields
    is_staff = models.BooleanField(default=False, verbose_name='স্টাফ স্ট্যাটাস')
    date_joined = models.DateTimeField(default=timezone.now, verbose_name='নিবন্ধনের তারিখ')

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['full_name_bn', 'full_name_en', 'phone', 'nid']

    class Meta:
        verbose_name = 'ব্যবহারকারী'
        verbose_name_plural = 'ব্যবহারকারীগণ'
        ordering = ('-created_at',)

    def __str__(self):
        return f'{self.full_name_bn} ({self.email})'

    def save(self, *args, **kwargs):
        if not self.username:
            self.username = self.email.split('@')[0]
        super().save(*args, **kwargs)

    @property
    def is_head_office(self):
        return self.user_type == self.UserType.HEAD_OFFICE


class UserProfile(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='profile',
        verbose_name='ব্যবহারকারী',
    )
    father_name_bn = models.CharField(max_length=255, blank=True, verbose_name='পিতার নাম (বাংলায়)')
    mother_name_bn = models.CharField(max_length=255, blank=True, verbose_name='মাতার নাম (বাংলায়)')
    present_address = models.TextField(blank=True, verbose_name='বর্তমান ঠিকানা')
    permanent_address = models.TextField(blank=True, verbose_name='স্থায়ী ঠিকানা')
    blood_group = models.CharField(
        max_length=5, blank=True,
        choices=[
            ('A+', 'A+'), ('A-', 'A-'), ('B+', 'B+'), ('B-', 'B-'),
            ('AB+', 'AB+'), ('AB-', 'AB-'), ('O+', 'O+'), ('O-', 'O-'),
        ],
        verbose_name='রক্তের গ্রুপ',
    )
    gender = models.CharField(
        max_length=10, blank=True,
        choices=[('male', 'পুরুষ'), ('female', 'মহিলা'), ('other', 'অন্যান্য')],
        verbose_name='লিঙ্গ',
    )
    date_of_birth = models.DateField(null=True, blank=True, verbose_name='জন্ম তারিখ')
    emergency_contact = models.CharField(max_length=11, blank=True, verbose_name='জরুরি যোগাযোগ')
    bio = models.TextField(blank=True, verbose_name='সংক্ষিপ্ত বিবরণ')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'ব্যবহারকারী প্রোফাইল'
        verbose_name_plural = 'ব্যবহারকারী প্রোফাইল'

    def __str__(self):
        return f'{self.user.full_name_bn} - প্রোফাইল'
