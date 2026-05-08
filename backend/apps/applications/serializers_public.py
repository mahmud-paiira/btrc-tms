from rest_framework import serializers
from .models import Application
from apps.circulars.models import Circular


class NIDUploadSerializer(serializers.Serializer):
    front_image = serializers.ImageField(label='এনআইডির সামনের ছবি')
    back_image = serializers.ImageField(required=False, allow_null=True, label='এনআইডির পেছনের ছবი')


class PublicApplySerializer(serializers.ModelSerializer):
    circular_url = serializers.SlugField(write_only=True, label='সার্কুলার ইউআরএল')

    class Meta:
        model = Application
        fields = (
            'circular_url',
            'name_bn', 'name_en',
            'father_name_bn', 'mother_name_bn',
            'date_of_birth', 'nid',
            'phone', 'email',
            'present_address', 'permanent_address',
            'education_qualification', 'profile_image',
        )

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
        if Application.objects.filter(nid=clean).exists():
            raise serializers.ValidationError('এই এনআইডি নম্বর দিয়ে ইতিমধ্যে আবেদন করা হয়েছে')
        return clean

    def validate_date_of_birth(self, value):
        from datetime import date
        today = date.today()
        age = today.year - value.year - ((today.month, today.day) < (value.month, value.day))
        if age < 18:
            raise serializers.ValidationError('বয়স কমপক্ষে ১৮ বছর হতে হবে')
        return value

    def validate_circular_url(self, value):
        try:
            circular = Circular.objects.get(public_url=value, status=Circular.Status.PUBLISHED)
        except Circular.DoesNotExist:
            raise serializers.ValidationError('সার্কুলারটি বৈধ নয় বা প্রকাশিত হয়নি')
        return circular

    def create(self, validated_data):
        circular = validated_data.pop('circular_url')
        application = Application.objects.create(circular=circular, **validated_data)
        return application


class ApplicationConfirmSerializer(serializers.ModelSerializer):
    circular_title_bn = serializers.CharField(source='circular.title_bn', read_only=True)
    center_name_bn = serializers.CharField(source='circular.center.name_bn', read_only=True)

    class Meta:
        model = Application
        fields = (
            'application_no', 'name_bn', 'nid', 'phone',
            'circular_title_bn', 'center_name_bn',
            'applied_at', 'status',
        )
