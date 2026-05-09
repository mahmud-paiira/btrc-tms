from rest_framework import serializers
from .models import User, UserProfile, Role, LoginLog
from apps.centers.models import Center, ActionLog


class HOUserListSerializer(serializers.ModelSerializer):
    center_code = serializers.CharField(source='center.code', read_only=True, default=None)
    center_name = serializers.CharField(source='center.name_bn', read_only=True, default=None)
    user_type_display = serializers.CharField(source='get_user_type_display', read_only=True)
    role_name = serializers.CharField(source='role.name', read_only=True, default=None)
    profile_image_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            'id', 'email', 'full_name_bn', 'full_name_en', 'user_type', 'user_type_display',
            'center', 'center_code', 'center_name', 'phone', 'nid', 'role', 'role_name',
            'profile_image', 'profile_image_url', 'is_active', 'last_login', 'created_at',
        )

    def get_profile_image_url(self, obj):
        if obj.profile_image:
            return obj.profile_image.url
        return None


class HOUserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        exclude = ('user', 'created_at', 'updated_at')


class HOUserDetailSerializer(serializers.ModelSerializer):
    center_code = serializers.CharField(source='center.code', read_only=True, default=None)
    center_name = serializers.CharField(source='center.name_bn', read_only=True, default=None)
    user_type_display = serializers.CharField(source='get_user_type_display', read_only=True)
    role_name = serializers.CharField(source='role.name', read_only=True, default=None)
    profile_image_url = serializers.SerializerMethodField()
    profile = HOUserProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = '__all__'

    def get_profile_image_url(self, obj):
        if obj.profile_image:
            return obj.profile_image.url
        return None


class HOUserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, min_length=8)
    auto_generate_password = serializers.BooleanField(write_only=True, default=False)
    profile = HOUserProfileSerializer(required=False)
    send_welcome_email = serializers.BooleanField(write_only=True, default=True)

    class Meta:
        model = User
        fields = (
            'email', 'user_type', 'center', 'role',
            'full_name_bn', 'full_name_en', 'phone', 'nid',
            'birth_certificate_no', 'profile_image', 'is_active',
            'password', 'auto_generate_password', 'profile', 'send_welcome_email',
        )

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('এই ইমেইল ইতিমধ্যে ব্যবহার হচ্ছে')
        return value

    def create(self, validated_data):
        import secrets
        import string
        profile_data = validated_data.pop('profile', None)
        send_email = validated_data.pop('send_welcome_email', True)
        auto_gen = validated_data.pop('auto_generate_password', False)
        password = validated_data.pop('password', None)

        if auto_gen or not password:
            password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(12))

        user = User.objects.create_user(
            email=validated_data.pop('email'),
            password=password,
            **validated_data,
        )

        if profile_data:
            UserProfile.objects.update_or_create(user=user, defaults=profile_data)

        setattr(user, '_generated_password', password)
        setattr(user, '_send_email', send_email)
        return user


class HOUserUpdateSerializer(serializers.ModelSerializer):
    profile = HOUserProfileSerializer(required=False)

    class Meta:
        model = User
        fields = (
            'full_name_bn', 'full_name_en', 'phone', 'nid',
            'birth_certificate_no', 'profile_image', 'is_active',
            'user_type', 'center', 'role', 'profile',
        )

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if profile_data:
            UserProfile.objects.update_or_create(user=instance, defaults=profile_data)
        return instance


class HOUserImportSerializer(serializers.Serializer):
    file = serializers.FileField()
    send_welcome = serializers.BooleanField(default=True)
    update_existing = serializers.BooleanField(default=False)


class LoginLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = LoginLog
        fields = '__all__'


class ActionLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.full_name_bn', read_only=True, default=None)

    class Meta:
        model = ActionLog
        fields = ('id', 'user', 'user_name', 'action', 'target_type', 'target_id',
                  'description', 'ip_address', 'created_at')


# ── Role Serializers ──────────────────────────────────────────────────────

class RoleSerializer(serializers.ModelSerializer):
    permission_count = serializers.SerializerMethodField()

    class Meta:
        model = Role
        fields = ('id', 'name', 'description', 'user_type', 'permissions', 'permission_count',
                  'is_system', 'created_at')
        read_only_fields = ('is_system',)

    def get_permission_count(self, obj):
        return len(obj.permissions) if obj.permissions else 0


class RolePermissionSerializer(serializers.Serializer):
    key = serializers.CharField()
    label = serializers.CharField()
    children = serializers.ListField(child=serializers.DictField(), required=False)
