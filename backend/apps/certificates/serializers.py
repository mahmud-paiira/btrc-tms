from rest_framework import serializers
from .models import Certificate, CertificateBatchZip


class CertificateSerializer(serializers.ModelSerializer):
    trainee_name = serializers.CharField(
        source='trainee.user.full_name_bn', read_only=True,
    )
    trainee_name_en = serializers.CharField(
        source='trainee.user.full_name_en', read_only=True, default=None,
    )
    trainee_reg_no = serializers.CharField(
        source='trainee.registration_no', read_only=True,
    )
    trainee_nid = serializers.CharField(
        source='trainee.user.nid', read_only=True, default=None,
    )
    batch_name = serializers.CharField(
        source='batch.batch_name_bn', read_only=True, default=None,
    )
    course_name = serializers.CharField(
        source='batch.course.name_bn', read_only=True, default=None,
    )
    verified_by_name = serializers.CharField(
        source='verified_by.full_name_bn', read_only=True, default=None,
    )

    class Meta:
        model = Certificate
        fields = '__all__'
        read_only_fields = (
            'certificate_no', 'qr_code_url', 'qr_code_image', 'pdf_file',
            'verification_url', 'issue_date', 'is_verified',
            'verified_count', 'last_verified_at', 'verified_by', 'created_at',
        )


class IssueCertificateSerializer(serializers.Serializer):
    trainee = serializers.IntegerField(label='প্রশিক্ষণার্থী')
    batch = serializers.IntegerField(label='ব্যাচ')

    def validate(self, data):
        from apps.trainees.models import Trainee
        from apps.batches.models import Batch
        try:
            Trainee.objects.get(id=data['trainee'])
        except Trainee.DoesNotExist:
            raise serializers.ValidationError({'trainee': 'প্রশিক্ষণার্থী পাওয়া যায়নি'})
        try:
            Batch.objects.get(id=data['batch'])
        except Batch.DoesNotExist:
            raise serializers.ValidationError({'batch': 'ব্যাচ পাওয়া যায়নি'})
        if Certificate.objects.filter(
            trainee_id=data['trainee'], batch_id=data['batch'],
        ).exists():
            raise serializers.ValidationError(
                'এই প্রশিক্ষণার্থীর জন্য ইতিমধ্যে সার্টিফিকেট তৈরি হয়েছে',
            )
        return data


class BatchIssueSerializer(serializers.Serializer):
    batch = serializers.IntegerField(label='ব্যাচ')
    trainees = serializers.ListField(
        child=serializers.IntegerField(),
        label='প্রশিক্ষণার্থী তালিকা',
    )

    def validate(self, data):
        from apps.batches.models import Batch
        if not Batch.objects.filter(id=data['batch']).exists():
            raise serializers.ValidationError({'batch': 'ব্যাচ পাওয়া যায়নি'})
        if not data['trainees']:
            raise serializers.ValidationError({'trainees': 'কমপক্ষে একজন প্রশিক্ষণার্থী নির্বাচন করুন'})
        return data


class EligibleTraineeSerializer(serializers.Serializer):
    trainee_id = serializers.IntegerField()
    trainee_name = serializers.CharField()
    trainee_reg_no = serializers.CharField()
    trainee_nid = serializers.CharField()
    has_certificate = serializers.BooleanField()


class PublicCertificateSerializer(serializers.Serializer):
    is_valid = serializers.BooleanField()
    certificate_no = serializers.CharField()
    trainee_name = serializers.CharField()
    trainee_reg_no = serializers.CharField()
    batch_name = serializers.CharField()
    course_name = serializers.CharField()
    center_name = serializers.CharField()
    issue_date = serializers.DateField()
    is_verified = serializers.BooleanField()
    verified_count = serializers.IntegerField()


class TaskStatusSerializer(serializers.Serializer):
    task_id = serializers.CharField()
    state = serializers.CharField()
    progress = serializers.DictField(child=serializers.CharField(), required=False)


class CertificateBatchZipSerializer(serializers.ModelSerializer):
    class Meta:
        model = CertificateBatchZip
        fields = '__all__'
