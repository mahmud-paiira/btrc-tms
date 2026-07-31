from rest_framework import serializers
from apps.common.utils import to_english_digits
from .models import Application


class EyeScreeningTestSerializer(serializers.ModelSerializer):
    tested_by_name = serializers.SerializerMethodField()
    evidence_file_url = serializers.SerializerMethodField()

    class Meta:
        from .models import EyeScreeningTest
        model = EyeScreeningTest
        fields = (
            'id', 'application', 'result', 'evidence_file', 'evidence_file_url',
            'remarks', 'tested_by', 'tested_by_name', 'tested_at',
        )
        read_only_fields = ('id', 'tested_by', 'tested_by_name', 'tested_at')

    def get_tested_by_name(self, obj):
        if obj.tested_by:
            return obj.tested_by.full_name_bn or obj.tested_by.email
        return None

    def get_evidence_file_url(self, obj):
        if obj.evidence_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.evidence_file.url)
            return obj.evidence_file.url
        return None

    def validate(self, attrs):
        result = attrs.get('result')
        if result == 'fail' and not attrs.get('remarks', '').strip():
            raise serializers.ValidationError({'remarks': 'ব্যর্থ হলে কারণ উল্লেখ করা আবশ্যক'})
        if not attrs.get('evidence_file') and not self.instance:
            raise serializers.ValidationError({'evidence_file': 'প্রমাণপত্র আপলোড করা আবশ্যক'})
        return attrs


class ApplicationListSerializer(serializers.ModelSerializer):
    circular_title = serializers.CharField(source='circular.title_bn', read_only=True)
    center_code = serializers.CharField(source='chosen_center.code', read_only=True, default=None)
    center_name = serializers.CharField(source='chosen_center.name_bn', read_only=True, default=None)
    routed_center_code = serializers.CharField(source='routed_center.code', read_only=True, default=None)
    routed_center_name = serializers.CharField(source='routed_center.name_bn', read_only=True, default=None)
    eye_screening_result = serializers.SerializerMethodField()

    class Meta:
        model = Application
        fields = (
            'id', 'application_no', 'name_bn', 'nid', 'phone',
            'circular', 'circular_title',
            'center_code', 'center_name',
            'routed_center_code', 'routed_center_name',
            'status', 'merit_score', 'waitlist_position',
            'auto_screen_pass', 'auto_screen_score',
            'applied_at', 'reviewed_at', 'eye_screening_result',
        )

    def get_eye_screening_result(self, obj):
        try:
            return obj.eye_screening.result
        except Exception:
            return None


class ApplicationDetailSerializer(serializers.ModelSerializer):
    circular_title = serializers.CharField(source='circular.title_bn', read_only=True)
    course_name = serializers.CharField(source='circular.course.name_bn', read_only=True)
    center_name = serializers.CharField(source='chosen_center.name_bn', read_only=True, default=None)
    center_code = serializers.CharField(source='chosen_center.code', read_only=True, default=None)
    reviewed_by_name = serializers.CharField(source='reviewed_by.get_full_name', read_only=True, default=None)
    eye_screening = EyeScreeningTestSerializer(read_only=True)

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
        value = to_english_digits(value).strip()
        if not value.isdigit() or len(value) != 11:
            raise serializers.ValidationError('ফোন নম্বর ১১ ডিজিটের হতে হবে (01XXXXXXXXX)')
        if not value.startswith('01'):
            raise serializers.ValidationError('ফোন নম্বর 01 দিয়ে শুরু হতে হবে')
        qs = Application.objects.filter(phone=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('এই মোবাইল নম্বর দিয়ে ইতিমধ্যে আবেদন করা হয়েছে')
        return value

    def validate_nid(self, value):
        clean = to_english_digits(value).replace(' ', '').replace('-', '')
        if len(clean) not in (10, 13, 17):
            raise serializers.ValidationError('এনআইডি ১০, ১৩ বা ১৭ ডিজিটের হতে হবে')
        qs = Application.objects.filter(nid=clean)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('এই এনআইডি নম্বর দিয়ে ইতিমধ্যে আবেদন করা হয়েছে')
        return clean

    def validate_date_of_birth(self, value):
        from datetime import date
        today = date.today()
        age = today.year - value.year - ((today.month, today.day) < (value.month, value.day))
        if age < 21:
            raise serializers.ValidationError('বয়স কমপক্ষে ২১ বছর হতে হবে')
        return value


class ApplicationStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Application.ApplicationStatus.choices, label='অবস্থা')
    remarks = serializers.CharField(required=False, allow_blank=True, label='মন্তব্য')

    def validate(self, attrs):
        if attrs.get('status') == 'rejected' and not attrs.get('remarks', '').strip():
            raise serializers.ValidationError({'remarks': 'বাতিলের কারণ উল্লেখ করা আবশ্যক'})
        return attrs


class ApplicationExportSerializer(serializers.ModelSerializer):
    circular_title = serializers.CharField(source='circular.title_bn', read_only=True)
    center_name = serializers.CharField(source='chosen_center.name_bn', read_only=True, default=None)
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
