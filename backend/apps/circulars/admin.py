from django.contrib import admin
from .models import Circular, ChecklistItem, CircularCenterAllocation


class ChecklistItemInline(admin.TabularInline):
    model = ChecklistItem
    extra = 1
    fields = ('criteria_type', 'label_bn', 'operator', 'expected_value', 'score', 'order')


@admin.register(Circular)
class CircularAdmin(admin.ModelAdmin):
    list_display = (
        'title_bn', 'public_url', 'centers_display', 'course',
        'total_seats', 'remaining_seats', 'status', 'published_at',
    )
    list_filter = ('status', 'eligible_centers', 'course')
    search_fields = ('title_bn', 'title_en', 'public_url')
    readonly_fields = ('public_url', 'remaining_seats', 'published_at', 'created_at', 'updated_at')
    filter_horizontal = ('eligible_centers',)
    inlines = [ChecklistItemInline]

    fieldsets = (
        (None, {
            'fields': ('eligible_centers', 'course', 'title_bn', 'title_en'),
        }),
        ('তারিখ', {
            'fields': (
                'application_start_date', 'application_end_date',
                'training_start_date', 'training_end_date',
            ),
        }),
        ('আসন ও ফি', {
            'fields': ('total_seats', 'remaining_seats', 'fee'),
        }),
        ('অটো-স্ক্রিনিং', {
            'fields': ('auto_screen_total_score', 'auto_screen_min_score'),
        }),
        ('অবস্থা', {
            'fields': ('status', 'public_url', 'published_at', 'created_by'),
        }),
        ('বিস্তারিত', {
            'fields': ('description',),
        }),
    )

    def centers_display(self, obj):
        return ', '.join(obj.eligible_centers.values_list('code', flat=True)[:3])
    centers_display.short_description = 'কেন্দ্রসমূহ'

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(CircularCenterAllocation)
class CircularCenterAllocationAdmin(admin.ModelAdmin):
    list_display = ('circular', 'center', 'allocated_seats')
    list_filter = ('circular', 'center')
    search_fields = ('circular__title_bn', 'center__name_bn')
