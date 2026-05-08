from rest_framework import serializers
from .models import User, UserProfile


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        exclude = ('user', 'created_at', 'updated_at')


class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = (
            'id', 'email', 'username', 'user_type', 'center',
            'full_name_bn', 'full_name_en', 'phone', 'nid',
            'birth_certificate_no', 'profile_image', 'is_active',
            'last_login', 'created_at', 'profile',
        )
        read_only_fields = ('id', 'last_login', 'created_at')


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    profile = UserProfileSerializer(required=False)

    class Meta:
        model = User
        fields = (
            'email', 'password', 'username', 'user_type', 'center',
            'full_name_bn', 'full_name_en', 'phone', 'nid',
            'birth_certificate_no', 'profile_image', 'profile',
        )

    def create(self, validated_data):
        profile_data = validated_data.pop('profile', None)
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        if profile_data:
            UserProfile.objects.update_or_create(user=user, defaults=profile_data)
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(label='ইমেইল')
    password = serializers.CharField(write_only=True, label='পাসওয়ার্ড')
