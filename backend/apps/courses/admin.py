from django.contrib import admin
from .models import (
    Course,
    CourseConfiguration,
    CourseBill,
    CourseChapter,
    UnitOfCompetency,
)


class CourseConfigurationInline(admin.StackedInline):
    model = CourseConfiguration
    can_delete = False
    verbose_name_plural = 'কোর্স কনফিগারেশন'
    extra = 0


class CourseBillInline(admin.TabularInline):
    model = CourseBill
    verbose_name_plural = 'কোর্স বিল'
    extra = 1


class CourseChapterInline(admin.TabularInline):
    model = CourseChapter
    verbose_name_plural = 'কোর্স অধ্যায়'
    extra = 1


class UnitOfCompetencyInline(admin.TabularInline):
    model = UnitOfCompetency
    verbose_name_plural = 'কম্পিটেন্সি ইউনিট'
    extra = 1


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    inlines = (
        CourseConfigurationInline,
        CourseBillInline,
        CourseChapterInline,
        UnitOfCompetencyInline,
    )

    list_display = (
        'code', 'name_bn', 'course_type', 'term', 'session',
        'duration_months', 'fee', 'status', 'created_at',
    )
    list_filter = ('course_type', 'term', 'session', 'status', 'stipend_eligible')
    search_fields = ('code', 'name_bn', 'name_en')
    readonly_fields = ('created_at', 'updated_at')

    fieldsets = (
        (None, {
            'fields': ('code', 'name_bn', 'name_en'),
        }),
        ('কোর্স的分类', {
            'fields': ('course_type', 'term', 'session'),
        }),
        ('সময় ও ফি', {
            'fields': ('duration_months', 'duration_hours', 'total_training_days', 'fee'),
        }),
        ('টার্গেট', {
            'fields': ('unit_cost', 'total_target', 'stipend_eligible', 'employment_eligible'),
        }),
        ('অন্যান্য', {
            'fields': ('description', 'status', 'created_by', 'created_at', 'updated_at'),
        }),
    )

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(CourseConfiguration)
class CourseConfigurationAdmin(admin.ModelAdmin):
    list_display = ('course', 'passing_marks', 'attendance_requirement')
    search_fields = ('course__code', 'course__name_bn')


@admin.register(CourseBill)
class CourseBillAdmin(admin.ModelAdmin):
    list_display = ('bill_item_bn', 'course', 'amount', 'is_mandatory')
    list_filter = ('is_mandatory',)
    search_fields = ('bill_item_bn', 'course__code')


@admin.register(CourseChapter)
class CourseChapterAdmin(admin.ModelAdmin):
    list_display = ('course', 'chapter_no', 'title_bn', 'duration_hours')
    list_filter = ('course',)
    search_fields = ('title_bn', 'title_en')


@admin.register(UnitOfCompetency)
class UnitOfCompetencyAdmin(admin.ModelAdmin):
    list_display = ('code', 'name_bn', 'course', 'assessment_method')
    search_fields = ('code', 'name_bn', 'name_en')
