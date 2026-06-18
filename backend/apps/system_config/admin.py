from django.contrib import admin
from .models import SystemSetting, EmailTemplate, SmsTemplate, IntegrationConfig, BackupConfig, Gender, Education, Demography


@admin.register(SystemSetting)
class SystemSettingAdmin(admin.ModelAdmin):
    list_display = ('key', 'value', 'data_type', 'updated_at')
    list_filter = ('data_type',)
    search_fields = ('key', 'description')
    readonly_fields = ('updated_at', 'created_at')


@admin.register(EmailTemplate)
class EmailTemplateAdmin(admin.ModelAdmin):
    list_display = ('name', 'updated_at')
    search_fields = ('name',)


@admin.register(SmsTemplate)
class SmsTemplateAdmin(admin.ModelAdmin):
    list_display = ('name', 'updated_at')
    search_fields = ('name',)


@admin.register(IntegrationConfig)
class IntegrationConfigAdmin(admin.ModelAdmin):
    list_display = ('name', 'provider', 'is_active', 'last_test_status', 'last_test_at')
    list_filter = ('provider', 'is_active')
    search_fields = ('name',)


@admin.register(BackupConfig)
class BackupConfigAdmin(admin.ModelAdmin):
    list_display = ('schedule', 'retention_days', 'is_active', 'last_backup_at')


@admin.register(Gender)
class GenderAdmin(admin.ModelAdmin):
    list_display = ('name_bn', 'name_en', 'order')
    search_fields = ('name_bn', 'name_en')


@admin.register(Education)
class EducationAdmin(admin.ModelAdmin):
    list_display = ('name_bn', 'name_en', 'rank', 'order')
    search_fields = ('name_bn', 'name_en')


@admin.register(Demography)
class DemographyAdmin(admin.ModelAdmin):
    list_display = ('name_bn', 'name_en', 'type', 'parent', 'bbs_code')
    list_filter = ('type',)
    search_fields = ('name_bn', 'name_en')
