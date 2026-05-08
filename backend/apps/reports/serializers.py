from rest_framework import serializers
from .models import Report


class ReportSerializer(serializers.ModelSerializer):
    generated_by_name = serializers.CharField(
        source='generated_by.full_name_bn', read_only=True, default=None,
    )
    report_type_display = serializers.CharField(
        source='get_report_type_display', read_only=True,
    )

    class Meta:
        model = Report
        fields = '__all__'
        read_only_fields = (
            'generated_by', 'file', 'is_ready',
            'task_id', 'error_message', 'generated_at', 'created_at',
        )


class ReportGenerateSerializer(serializers.Serializer):
    report_type = serializers.ChoiceField(
        choices=Report.ReportType.choices, label='প্রতিবেদনের ধরণ',
    )
    title = serializers.CharField(label='শিরোনাম')
    parameters = serializers.JSONField(default=dict, label='প্যারামিটার')

    def validate_parameters(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError('প্যারামিটার একটি অবজেক্ট হতে হবে')
        return value