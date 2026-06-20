from datetime import timedelta
from django.conf import settings
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User, OTPVerification, LoginLog
from .serializers_public import (
    PublicRegisterSerializer,
    PublicOTPVerifySerializer,
    PublicLoginSerializer,
)
from .services import generate_otp, send_otp_sms


@api_view(['POST'])
@permission_classes([AllowAny])
def public_register(request):
    serializer = PublicRegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.save()

    otp_code = generate_otp()
    OTPVerification.objects.create(
        user=user,
        otp_code=otp_code,
        purpose=OTPVerification.Purpose.REGISTRATION,
        expires_at=timezone.now() + timedelta(minutes=5),
    )
    send_otp_sms(user.phone, otp_code)

    return Response({
        'message': 'নিবন্ধন সফল হয়েছে। OTP কোড পাঠানো হয়েছে।',
        'phone': user.phone,
        'user_id': user.id,
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([AllowAny])
def public_verify_otp(request):
    serializer = PublicOTPVerifySerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    phone = serializer.validated_data['phone']
    otp_code = serializer.validated_data['otp_code']

    try:
        user = User.objects.get(phone=phone)
    except User.DoesNotExist:
        return Response({'error': 'একাউন্ট পাওয়া যায়নি'}, status=404)

    test_otp = getattr(settings, 'TEST_OTP', None)

    if test_otp and otp_code == str(test_otp):
        OTPVerification.objects.filter(
            user=user,
            purpose=OTPVerification.Purpose.REGISTRATION,
        ).update(is_verified=True)
    else:
        otp = OTPVerification.objects.filter(
            user=user, otp_code=otp_code,
            purpose=OTPVerification.Purpose.REGISTRATION,
            is_verified=False,
        ).last()

        if not otp:
            return Response({'error': 'ভুল OTP কোড'}, status=400)

        if otp.is_expired:
            return Response({'error': 'OTP কোডের মেয়াদ শেষ হয়েছে'}, status=400)

        otp.is_verified = True
        otp.save(update_fields=['is_verified'])
    user.is_phone_verified = True
    user.save(update_fields=['is_phone_verified'])

    refresh = RefreshToken.for_user(user)
    return Response({
        'message': 'মোবাইল নিশ্চিতকরণ সফল হয়েছে',
        'access_token': str(refresh.access_token),
        'refresh_token': str(refresh),
        'user': {
            'id': user.id,
            'full_name_bn': user.full_name_bn,
            'full_name_en': user.full_name_en,
            'phone': user.phone,
            'nid': user.nid,
            'email': user.email,
            'user_type': user.user_type,
        },
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def public_resend_otp(request):
    phone = request.data.get('phone', '')
    if not phone or not phone.isdigit() or len(phone) != 11:
        return Response({'error': 'বৈধ মোবাইল নম্বর দিন (01XXXXXXXXX)'}, status=400)

    try:
        user = User.objects.get(phone=phone)
    except User.DoesNotExist:
        return Response({'error': 'এই মোবাইল নম্বর দিয়ে কোন একাউন্ট নেই'}, status=404)

    if user.is_phone_verified:
        return Response({'error': 'এই নম্বর ইতিমধ্যে নিশ্চিত করা হয়েছে'}, status=400)

    OTPVerification.objects.filter(
        user=user,
        purpose=OTPVerification.Purpose.REGISTRATION,
        is_verified=False,
        is_expired=False,
    ).update(is_verified=True)

    otp_code = generate_otp()
    OTPVerification.objects.create(
        user=user,
        otp_code=otp_code,
        purpose=OTPVerification.Purpose.REGISTRATION,
        expires_at=timezone.now() + timedelta(minutes=5),
    )
    send_otp_sms(user.phone, otp_code)

    return Response({'message': 'OTP কোড পুনরায় পাঠানো হয়েছে'})


@api_view(['POST'])
@permission_classes([AllowAny])
def public_check_user(request):
    phone = request.data.get('phone', '')
    nid = request.data.get('nid', '')
    exists = False
    if phone and phone.isdigit() and len(phone) == 11:
        exists = User.objects.filter(phone=phone).exists()
    if nid:
        clean_nid = nid.replace(' ', '').replace('-', '')
        exists = exists or User.objects.filter(nid=clean_nid).exists()
    return Response({'exists': exists})


@api_view(['POST'])
@permission_classes([AllowAny])
def public_login(request):
    serializer = PublicLoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.validated_data['user']

    ip = request.META.get('REMOTE_ADDR', '')
    ua = request.META.get('HTTP_USER_AGENT', '')
    LoginLog.objects.create(user=user, ip_address=ip, user_agent=ua, is_success=True)

    refresh = RefreshToken.for_user(user)
    return Response({
        'access_token': str(refresh.access_token),
        'refresh_token': str(refresh),
        'user': {
            'id': user.id,
            'full_name_bn': user.full_name_bn,
            'full_name_en': user.full_name_en,
            'phone': user.phone,
            'nid': user.nid,
            'email': user.email,
            'user_type': user.user_type,
        },
    })
