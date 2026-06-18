from django.contrib.auth import authenticate
from rest_framework import serializers
from .models import User


class PublicRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True, min_length=6,
        label='পাসওয়ার্ড',
    )
    confirm_password = serializers.CharField(
        write_only=True, min_length=6,
        label='পাসওয়ার্ড নিশ্চিতকরণ',
    )
    email = serializers.EmailField(required=False, allow_blank=True, label='ইমেইল')

    class Meta:
        model = User
        fields = (
            'full_name_bn', 'full_name_en',
            'phone', 'nid', 'email',
            'password', 'confirm_password',
        )

    def validate_phone(self, value):
        if not value.isdigit() or len(value) != 11:
            raise serializers.ValidationError('ফোন নম্বর ১১ ডিজিটের হতে হবে (01XXXXXXXXX)')
        if not value.startswith('01'):
            raise serializers.ValidationError('ফোন নম্বর 01 দিয়ে শুরু হতে হবে')
        if User.objects.filter(phone=value).exists():
            raise serializers.ValidationError('এই মোবাইল নম্বর দিয়ে ইতিমধ্যে একাউন্ট আছে')
        return value

    def validate_nid(self, value):
        clean = value.replace(' ', '').replace('-', '')
        if len(clean) not in (10, 17):
            raise serializers.ValidationError('এনআইডি ১০ বা ১৭ ডিজিটের হতে হবে')
        if User.objects.filter(nid=clean).exists():
            raise serializers.ValidationError('এই এনআইডি দিয়ে ইতিমধ্যে একাউন্ট আছে')
        return clean

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'পাসওয়ার্ড দুটি একই হতে হবে'})
        return data

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        email = validated_data.pop('email', '') or f'phone_{validated_data["phone"]}@brtc.app'
        user = User(
            email=email,
            username=email.split('@')[0],
            full_name_bn=validated_data['full_name_bn'],
            full_name_en=validated_data['full_name_en'],
            phone=validated_data['phone'],
            nid=validated_data['nid'],
            user_type=User.UserType.TRAINEE,
            is_active=True,
            is_phone_verified=False,
        )
        user.set_password(validated_data['password'])
        user.save()
        return user


class PublicOTPVerifySerializer(serializers.Serializer):
    phone = serializers.CharField(label='মোবাইল নম্বর')
    otp_code = serializers.CharField(max_length=6, label='OTP কোড')

    def validate_phone(self, value):
        if not value.isdigit() or len(value) != 11:
            raise serializers.ValidationError('ফোন নম্বর ১১ ডিজিটের হতে হবে')
        return value


class PublicLoginSerializer(serializers.Serializer):
    identifier = serializers.CharField(label='মোবাইল বা এনআইডি')
    password = serializers.CharField(label='পাসওয়ার্ড')

    def validate(self, data):
        identifier = data['identifier'].strip()
        password = data['password']

        try:
            if identifier.isdigit() and len(identifier) == 11:
                user = User.objects.get(phone=identifier)
            else:
                user = User.objects.get(nid=identifier)
        except User.DoesNotExist:
            raise serializers.ValidationError('একাউন্ট পাওয়া যায়নি')

        auth_user = authenticate(username=user.email, password=password)
        if auth_user is None:
            raise serializers.ValidationError('ভুল পাসওয়ার্ড')

        data['user'] = auth_user
        return data
