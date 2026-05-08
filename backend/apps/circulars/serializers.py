from rest_framework import serializers
from .models import Circular


class CircularListSerializer(serializers.ModelSerializer):
    center_code = serializers.CharField(source='center.code', read_only=True)
    center_name = serializers.CharField(source='center.name_bn', read_only=True)
    course_code = serializers.CharField(source='course.code', read_only=True)
    course_name = serializers.CharField(source='course.name_bn', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Circular
        fields = (
            'id', 'public_url', 'title_bn', 'title_en',
            'center_code', 'center_name',
            'course_code', 'course_name',
            'total_seats', 'remaining_seats',
            'application_start_date', 'application_end_date',
            'status', 'status_display',
            'published_at', 'created_at',
        )


class CircularDetailSerializer(serializers.ModelSerializer):
    center_code = serializers.CharField(source='center.code', read_only=True)
    center_name = serializers.CharField(source='center.name_bn', read_only=True)
    center_address = serializers.CharField(source='center.address', read_only=True)
    center_phone = serializers.CharField(source='center.phone', read_only=True)
    course_code = serializers.CharField(source='course.code', read_only=True)
    course_name = serializers.CharField(source='course.name_bn', read_only=True)
    course_type = serializers.CharField(source='course.get_course_type_display', read_only=True)
    course_duration = serializers.CharField(source='course.duration_months', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    created_by_name = serializers.CharField(
        source='created_by.full_name_bn', read_only=True, default=None,
    )

    class Meta:
        model = Circular
        fields = '__all__'


class CircularWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Circular
        fields = '__all__'
        read_only_fields = (
            'public_url', 'remaining_seats',
            'published_at', 'created_at', 'updated_at', 'created_by',
        )


class PublicCircularSerializer(serializers.ModelSerializer):
    center_code = serializers.CharField(source='center.code', read_only=True)
    center_name = serializers.CharField(source='center.name_bn', read_only=True)
    center_address = serializers.CharField(source='center.address', read_only=True)
    center_phone = serializers.CharField(source='center.phone', read_only=True)
    course_code = serializers.CharField(source='course.code', read_only=True)
    course_name = serializers.CharField(source='course.name_bn', read_only=True)
    course_type_display = serializers.CharField(source='course.get_course_type_display', read_only=True)
    course_duration_months = serializers.IntegerField(source='course.duration_months', read_only=True)

    class Meta:
        model = Circular
        fields = (
            'public_url', 'title_bn', 'title_en', 'description',
            'center_code', 'center_name', 'center_address', 'center_phone',
            'course_code', 'course_name', 'course_type_display',
            'course_duration_months',
            'total_seats', 'remaining_seats',
            'application_start_date', 'application_end_date',
            'training_start_date', 'training_end_date',
        )
