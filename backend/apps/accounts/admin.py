from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _
from .models import User, UserProfile, Role, LoginLog


class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name_plural = 'বাড়তি প্রোফাইল তথ্য'
    extra = 0


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    inlines = (UserProfileInline,)

    list_display = (
        'email', 'full_name_bn', 'full_name_en', 'user_type',
        'center', 'phone', 'is_active',
    )
    list_filter = ('user_type', 'center', 'is_active', 'is_staff', 'is_superuser')
    search_fields = ('email', 'full_name_bn', 'full_name_en', 'phone', 'nid')
    ordering = ('-created_at',)

    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        (_('ব্যক্তিগত তথ্য'), {
            'fields': (
                'full_name_bn', 'full_name_en', 'phone', 'nid',
                'birth_certificate_no', 'profile_image',
            ),
        }),
        (_('ভূমিকা ও কেন্দ্র'), {
            'fields': ('user_type', 'center'),
        }),
        (_('অনুমতি'), {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions'),
        }),
        (_('নিরাপত্তা'), {
            'fields': ('mfa_secret',),
            'classes': ('collapse',),
        }),
        (_('গুরুত্বপূর্ণ তারিখ'), {
            'fields': ('last_login', 'created_at', 'date_joined'),
        }),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': (
                'email', 'full_name_bn', 'full_name_en', 'phone', 'nid',
                'user_type', 'center', 'password1', 'password2',
            ),
        }),
    )

    readonly_fields = ('created_at', 'last_login', 'date_joined')


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'gender', 'blood_group', 'date_of_birth', 'emergency_contact')
    search_fields = ('user__email', 'user__full_name_bn')
    list_filter = ('gender', 'blood_group')


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_system', 'permission_count', 'created_at')
    list_filter = ('is_system',)
    search_fields = ('name',)

    def permission_count(self, obj):
        return len(obj.permissions) if obj.permissions else 0
    permission_count.short_description = 'অনুমতির সংখ্যা'


@admin.register(LoginLog)
class LoginLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'login_time', 'ip_address', 'is_success')
    list_filter = ('is_success', 'login_time')
    search_fields = ('user__email', 'ip_address')
    readonly_fields = ('login_time',)
