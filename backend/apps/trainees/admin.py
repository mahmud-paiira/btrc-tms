from django.contrib import admin
from .models import Trainee
from .enrollment import EnrollmentAuditLog


@admin.register(Trainee)
class TraineeAdmin(admin.ModelAdmin):
    list_display = (
        'registration_no', 'user', 'center', 'batch',
        'status', 'enrollment_date',
    )
    list_filter = ('status', 'center', 'batch', 'enrollment_date')
    search_fields = (
        'registration_no', 'user__full_name_bn', 'user__email',
        'user__phone', 'user__nid',
    )
    readonly_fields = ('registration_no', 'enrollment_date', 'created_at', 'updated_at')
    raw_id_fields = ('user', 'application', 'batch')

    fieldsets = (
        (None, {
            'fields': ('registration_no', 'user', 'application', 'center', 'batch', 'status'),
        }),
        ('ব্যাংক তথ্য', {
            'fields': ('bank_account_no', 'bank_name', 'bank_branch'),
            'classes': ('collapse',),
        }),
        ('মনোনীত ব্যক্তি', {
            'fields': ('nominee_name', 'nominee_relation', 'nominee_phone'),
            'classes': ('collapse',),
        }),
        ('মেটাডেটা', {
            'fields': ('enrollment_date', 'created_at', 'updated_at'),
        }),
    )


@admin.register(EnrollmentAuditLog)
class EnrollmentAuditLogAdmin(admin.ModelAdmin):
    list_display = ('application_no', 'trainee_registration_no', 'user_email', 'result', 'created_at')
    list_filter = ('result',)
    search_fields = ('application_no', 'trainee_registration_no', 'user_email')
    readonly_fields = ('application_no', 'trainee_registration_no', 'user_email', 'result', 'error_message', 'created_at')
