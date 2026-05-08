from rest_framework import serializers
from .models import SystemSetting, EmailTemplate, SmsTemplate, IntegrationConfig, BackupConfig


class SystemSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemSetting
        fields = ('id', 'key', 'value', 'data_type', 'description', 'updated_at')
        read_only_fields = ('id', 'key', 'data_type', 'updated_at')

    def validate_value(self, value):
        data_type = self.instance.data_type if self.instance else self.initial_data.get('data_type', 'string')
        if data_type == 'integer':
            try:
                int(value)
            except (ValueError, TypeError):
                raise serializers.ValidationError('পূর্ণসংখ্যা হতে হবে')
        elif data_type == 'boolean':
            if str(value).lower() not in ('true', 'false', '1', '0'):
                raise serializers.ValidationError('true/false হতে হবে')
        elif data_type == 'float':
            try:
                float(value)
            except (ValueError, TypeError):
                raise serializers.ValidationError('দশমিক সংখ্যা হতে হবে')
        return value


class EmailTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailTemplate
        fields = ('id', 'name', 'subject_bn', 'subject_en', 'body_bn', 'body_en', 'updated_at')


class SmsTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = SmsTemplate
        fields = ('id', 'name', 'message_bn', 'message_en', 'updated_at')


class IntegrationConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = IntegrationConfig
        fields = ('id', 'name', 'provider', 'settings', 'is_active', 'last_test_at', 'last_test_status', 'updated_at')
        read_only_fields = ('last_test_at', 'last_test_status')


class BackupConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = BackupConfig
        fields = '__all__'
        read_only_fields = ('last_backup_at',)
