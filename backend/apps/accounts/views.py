from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User, LoginLog
from .serializers import UserSerializer, UserCreateSerializer, LoginSerializer


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.select_related('profile').all()
    serializer_class = UserSerializer
    filterset_fields = ('user_type', 'center', 'is_active')
    search_fields = ('email', 'full_name_bn', 'full_name_en', 'phone', 'nid')

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.user.is_authenticated:
            if self.request.user.user_type == 'head_office':
                return qs
            if self.request.user.center:
                return qs.filter(center=self.request.user.center)
            return qs.none()
        return qs.none()

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        return UserSerializer

    def perform_authentication(self, request):
        if self.action != 'login':
            super().perform_authentication(request)

    def get_permissions(self):
        if self.action in ('login', 'create'):
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def login(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']
        password = serializer.validated_data['password']
        if '@' in email:
            user = User.objects.filter(email=email).first()
        else:
            user = User.objects.filter(phone=email).first()
        if not user or not user.check_password(password):
            if user:
                LoginLog.objects.create(user=user, ip_address=request.META.get('REMOTE_ADDR', ''), user_agent=request.META.get('HTTP_USER_AGENT', ''), is_success=False)
            return Response(
                {'error': 'ইমেইল/মোবাইল বা পাসওয়ার্ড ভুল'},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        if not user.is_active:
            return Response(
                {'error': 'এই অ্যাকাউন্টটি সক্রিয় নয়'},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        LoginLog.objects.create(user=user, ip_address=request.META.get('REMOTE_ADDR', ''), user_agent=request.META.get('HTTP_USER_AGENT', ''), is_success=True)
        refresh = RefreshToken.for_user(user)
        user.last_login = None
        user.save(update_fields=['last_login'])
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
        })

    @action(detail=False, methods=['post'])
    def logout(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
        except Exception:
            pass
        return Response({'message': 'সফলভাবে লগআউট হয়েছে'})

    @action(detail=False, methods=['get'])
    def me(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)
