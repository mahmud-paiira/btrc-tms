from django.contrib import admin
from .models import Batch, BatchWeekPlan, BatchEnrollment


class BatchWeekPlanInline(admin.TabularInline):
    model = BatchWeekPlan
    extra = 0
    fields = (
        'term_no', 'term_day', 'session_no', 'class_type',
        'day_of_week', 'start_time', 'end_time', 'duration_hours',
        'lead_trainer', 'topic_bn',
    )
    raw_id_fields = ('lead_trainer', 'associate_trainer')
    ordering = ('term_no', 'term_day', 'session_no')


class BatchEnrollmentInline(admin.TabularInline):
    model = BatchEnrollment
    extra = 0
    fields = ('trainee', 'status', 'enrollment_date', 'dropped_date')
    raw_id_fields = ('trainee',)
    readonly_fields = ('enrollment_date',)


@admin.register(Batch)
class BatchAdmin(admin.ModelAdmin):
    list_display = (
        'batch_no', 'batch_name_bn', 'center', 'course',
        'start_date', 'end_date', 'status', 'filled_seats', 'total_seats',
    )
    list_filter = ('status', 'center', 'course')
    search_fields = ('batch_no', 'custom_batch_no', 'batch_name_bn', 'batch_name_en')
    readonly_fields = ('batch_no', 'created_at', 'updated_at')
    date_hierarchy = 'start_date'
    raw_id_fields = ('circular', 'created_by')
    inlines = [BatchWeekPlanInline, BatchEnrollmentInline]

    fieldsets = (
        (None, {
            'fields': ('batch_no', 'custom_batch_no', 'status'),
        }),
        ('ব্যাচ তথ্য', {
            'fields': (
                'batch_name_bn', 'batch_name_en',
                'circular', 'center', 'course',
            ),
        }),
        ('তারিখ ও আসন', {
            'fields': ('start_date', 'end_date', 'total_seats', 'filled_seats', 'waitlist_seats'),
        }),
        ('মেটাডেটা', {
            'fields': ('created_by', 'created_at', 'updated_at'),
        }),
    )


@admin.register(BatchWeekPlan)
class BatchWeekPlanAdmin(admin.ModelAdmin):
    list_display = (
        'batch', 'term_no', 'term_day', 'session_no',
        'class_type', 'day_of_week', 'start_time', 'end_time',
        'lead_trainer', 'training_room_bn',
    )
    list_filter = ('class_type', 'day_of_week', 'batch__center')
    search_fields = ('batch__batch_no', 'batch__batch_name_bn', 'topic_bn', 'topic_en')
    raw_id_fields = ('batch', 'lead_trainer', 'associate_trainer')
    ordering = ('batch', 'term_no', 'term_day', 'session_no')


@admin.register(BatchEnrollment)
class BatchEnrollmentAdmin(admin.ModelAdmin):
    list_display = ('trainee', 'batch', 'status', 'enrollment_date', 'dropped_date')
    list_filter = ('status', 'batch')
    search_fields = ('trainee__registration_no', 'trainee__user__full_name_bn', 'batch__batch_no')
    raw_id_fields = ('trainee', 'batch')
    readonly_fields = ('enrollment_date',)
