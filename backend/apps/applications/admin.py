from django.contrib import admin
from django.contrib.admin import SimpleListFilter
from django.db.models import Count, Avg, Q
from django.utils.html import format_html
from django.urls import path
from django.shortcuts import render
from django.http import JsonResponse
from django.db.models.functions import TruncDate
from django.conf import settings
from .models import Application, OcrAuditLog
from datetime import timedelta
from django.utils import timezone
import subprocess


class OCRStatusFilter(SimpleListFilter):
    title = 'OCR Status'
    parameter_name = 'ocr_status'

    def lookups(self, request, model_admin):
        return (
            ('working', 'OCR Working'),
            ('not_working', 'OCR Not Working'),
        )

    def queryset(self, request, queryset):
        return queryset


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = (
        'application_no', 'name_bn', 'nid', 'phone',
        'circular', 'status', 'applied_at',
    )
    list_filter = ('status', 'circular', 'applied_at')
    search_fields = ('application_no', 'name_bn', 'nid', 'phone')
    readonly_fields = ('application_no', 'applied_at', 'updated_at', 'reviewed_at')
    date_hierarchy = 'applied_at'

    fieldsets = (
        (None, {
            'fields': ('application_no', 'circular', 'status'),
        }),
        ('ব্যক্তিগত তথ্য', {
            'fields': (
                'name_bn', 'name_en',
                'father_name_bn', 'mother_name_bn', 'spouse_name_bn',
                'date_of_birth', 'nid',
            ),
        }),
        ('যোগাযোগ', {
            'fields': ('phone', 'alternate_phone', 'email'),
        }),
        ('ঠিকানা', {
            'fields': ('present_address', 'permanent_address'),
        }),
        ('শিক্ষা ও পেশা', {
            'fields': ('education_qualification', 'profession'),
        }),
        ('ডকুমেন্টস', {
            'fields': ('profile_image', 'nid_front_image', 'nid_back_image'),
        }),
        ('পর্যালোচনা', {
            'fields': ('reviewed_by', 'reviewed_at', 'remarks'),
        }),
        ('মেটাডেটা', {
            'fields': ('user', 'applied_at', 'updated_at'),
        }),
    )

    def get_actions(self, request):
        actions = super().get_actions(request)
        if 'delete_selected' in actions:
            del actions['delete_selected']
        return actions


@admin.register(OcrAuditLog)
class OcrAuditLogAdmin(admin.ModelAdmin):
    change_list_template = 'admin/apps/applications/ocrauditlog/change_list.html'
    list_display = (
        'colored_result', 'session_id_short', 'extracted_nid',
        'extracted_name_short', 'confidence_badge', 'ip_address', 'created_at',
    )
    list_display_links = ('session_id_short',)
    list_filter = ('result', 'created_at', 'confidence_score', OCRStatusFilter)
    search_fields = ('session_id', 'extracted_nid', 'extracted_name', 'ip_address')
    readonly_fields = (
        'session_id', 'extracted_nid', 'extracted_name',
        'confidence_score', 'result', 'created_at', 'ip_address',
        'raw_text_snippet', 'error_message', 'front_image', 'back_image',
    )
    date_hierarchy = 'created_at'
    list_select_related = True
    list_per_page = 50

    def session_id_short(self, obj):
        return obj.session_id[:12] + '...' if len(obj.session_id) > 12 else obj.session_id
    session_id_short.short_description = 'Session'

    def extracted_name_short(self, obj):
        return obj.extracted_name[:30] + '...' if len(obj.extracted_name) > 30 else obj.extracted_name
    extracted_name_short.short_description = 'Name'

    def colored_result(self, obj):
        colors = {'success': '067d34', 'low_confidence': 'b07c1a', 'failed': 'a02424'}
        labels = {'success': 'OK', 'low_confidence': 'Low', 'failed': 'Fail'}
        color = colors.get(obj.result, '666666')
        label = labels.get(obj.result, obj.result)
        return format_html(
            '<span style="background:#{};color:#fff;padding:2px 8px;border-radius:3px;font-size:11px;font-weight:600">{}</span>',
            color, label,
        )
    colored_result.short_description = 'Result'
    colored_result.admin_order_field = 'result'

    def confidence_badge(self, obj):
        pct = obj.confidence_score
        color = '067d34' if pct >= 60 else 'b07c1a' if pct >= 30 else 'a02424'
        return format_html(
            '<span style="color:#{};font-weight:600">{}%</span>', color, pct,
        )
    confidence_badge.short_description = 'Conf.'
    confidence_badge.admin_order_field = 'confidence_score'

    fieldsets = (
        (None, {
            'fields': ('session_id', 'result', 'confidence_score'),
        }),
        ('Extracted Data', {
            'fields': ('extracted_nid', 'extracted_name'),
        }),
        ('Images', {
            'fields': ('front_image', 'back_image'),
            'classes': ('collapse',),
        }),
        ('Details', {
            'fields': ('raw_text_snippet', 'error_message', 'ip_address', 'created_at'),
        }),
    )

    def get_actions(self, request):
        actions = super().get_actions(request)
        if 'delete_selected' in actions:
            del actions['delete_selected']
        return actions

    def changelist_view(self, request, extra_context=None):
        stats = OcrAuditLog.objects.aggregate(
            total=Count('id'),
            success=Count('id', filter=Q(result='success')),
            low=Count('id', filter=Q(result='low_confidence')),
            failed=Count('id', filter=Q(result='failed')),
            avg_conf=Avg('confidence_score'),
        )
        stats['success_rate'] = round(stats['success'] / stats['total'] * 100, 1) if stats['total'] else 0

        thirty_days_ago = timezone.now() - timedelta(days=30)
        daily = (
            OcrAuditLog.objects.filter(created_at__gte=thirty_days_ago)
            .annotate(date=TruncDate('created_at'))
            .values('date', 'result')
            .annotate(count=Count('id'))
            .order_by('date')
        )
        extra_context = extra_context or {'ocr_stats': stats, 'daily_trend': list(daily)}
        return super().changelist_view(request, extra_context=extra_context)

    def get_urls(self):
        urls = super().get_urls()
        custom = [
            path('ocr-stats/', self.admin_site.admin_view(self.ocr_stats_view), name='ocr-stats'),
        ]
        return custom + urls

    def ocr_stats_view(self, request):
        stats = OcrAuditLog.objects.aggregate(
            total=Count('id'),
            success=Count('id', filter=Q(result='success')),
            low=Count('id', filter=Q(result='low_confidence')),
            failed=Count('id', filter=Q(result='failed')),
            avg_conf=Avg('confidence_score'),
        )
        return JsonResponse(stats)
