from rest_framework import serializers
from .models import Application


class ApplicationListSerializer(serializers.ModelSerializer):
    circular_title = serializers.CharField(source='circular.title_bn', read_only=True)
    center_code = serializers.CharField(source='circular.center.code', read_only=True)

    class Meta:
        model = Application
        fields = (
            'id', 'application_no', 'name_bn', 'nid', 'phone',
            'circular', 'circular_title', 'center_code',
            'status', 'applied_at', 'reviewed_at',
        )


class ApplicationDetailSerializer(serializers.ModelSerializer):
    circular_title = serializers.CharField(source='circular.title_bn', read_only=True)
    center_name = serializers.CharField(source='circular.center.name_bn', read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.get_full_name', read_only=True, default=None)

    class Meta:
        model = Application
        fields = '__all__'


class ApplicationWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Application
        fields = (
            'circular', 'name_bn', 'name_en',
            'father_name_bn', 'mother_name_bn', 'spouse_name_bn',
            'date_of_birth', 'nid',
            'phone', 'alternate_phone', 'email',
            'present_address', 'permanent_address',
            'education_qualification', 'profession',
            'profile_image', 'nid_front_image', 'nid_back_image',
        )
        read_only_fields = ('application_no', 'status', 'applied_at', 'reviewed_at')

    def validate_phone(self, value):
        if not value.isdigit() or len(value) != 11:
            raise serializers.ValidationError('ফোন নম্বর ১১ ডিজিটের হতে হবে (01XXXXXXXXX)')
        if not value.startswith('01'):
            raise serializers.ValidationError('ফোন নম্বর 01 দিয়ে শুরু হতে হবে')
        return value

    def validate_nid(self, value):
        clean = value.replace(' ', '').replace('-', '')
        if len(clean) not in (10, 17):
            raise serializers.ValidationError('এনআইডি ১০ বা ১৭ ডিজিটের হতে হবে')
        return clean

    def validate_date_of_birth(self, value):
        from datetime import date
        today = date.today()
        age = today.year - value.year - ((today.month, today.day) < (value.month, value.day))
        if age < 18:
            raise serializers.ValidationError('বয়স কমপক্ষে ১৮ বছর হতে হবে')
        return value


class ApplicationStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Application.ApplicationStatus.choices, label='অবস্থা')
    remarks = serializers.CharField(required=False, allow_blank=True, label='মন্তব্য')


class ApplicationExportSerializer(serializers.ModelSerializer):
    circular_title = serializers.CharField(source='circular.title_bn', read_only=True)
    center_name = serializers.CharField(source='circular.center.name_bn', read_only=True)
    course_name = serializers.CharField(source='circular.course.name_bn', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Application
        fields = (
            'application_no', 'name_bn', 'name_en',
            'father_name_bn', 'mother_name_bn', 'spouse_name_bn',
            'date_of_birth', 'nid', 'phone', 'alternate_phone', 'email',
            'present_address', 'permanent_address',
            'education_qualification', 'profession',
            'circular_title', 'center_name', 'course_name',
            'status', 'status_display', 'applied_at', 'reviewed_at', 'remarks',
        )
