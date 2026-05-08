from django.contrib import admin
from .models import Center, Infrastructure, Employee


class InfrastructureInline(admin.TabularInline):
    model = Infrastructure
    extra = 1
    verbose_name_plural = 'অবকাঠামো'


class EmployeeInline(admin.TabularInline):
    model = Employee
    extra = 1
    verbose_name_plural = 'কর্মচারীগণ'


@admin.register(Center)
class CenterAdmin(admin.ModelAdmin):
    inlines = (InfrastructureInline, EmployeeInline)
    list_display = ('code', 'name_bn', 'name_en', 'phone', 'email', 'status', 'created_at')
    list_filter = ('status',)
    search_fields = ('code', 'name_bn', 'name_en', 'phone', 'email')
    readonly_fields = ('created_at',)
    fieldsets = (
        (None, {
            'fields': (
                'code', 'name_bn', 'name_en', 'short_name_bn',
            ),
        }),
        ('যোগাযোগ', {
            'fields': ('address', 'phone', 'email', 'website_url',
                       'contact_person_name', 'contact_person_phone'),
        }),
        ('অন্যান্য', {
            'fields': ('logo_url', 'status', 'created_at'),
        }),
    )


@admin.register(Infrastructure)
class InfrastructureAdmin(admin.ModelAdmin):
    list_display = ('room_no', 'center', 'location_bn', 'capacity', 'status')
    list_filter = ('status', 'center')
    search_fields = ('room_no', 'location_bn')


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ('employee_no', 'user', 'center', 'designation_bn', 'is_contact_person', 'status')
    list_filter = ('status', 'center', 'is_contact_person')
    search_fields = ('employee_no', 'user__full_name_bn', 'user__email')
