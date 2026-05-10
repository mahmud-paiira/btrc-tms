from rest_framework import viewsets, filters, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from .models import Circular
from .serializers import (
    CircularListSerializer,
    CircularDetailSerializer,
    CircularWriteSerializer,
    PublicCircularSerializer,
)


class IsHeadOffice(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.user_type == 'head_office' or request.user.is_superuser
        )


class IsHeadOfficeOrCenterAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.user_type in ('head_office', 'center_admin') or request.user.is_superuser:
            return True
        return False

    def filter_queryset(self, request, queryset, view):
        if request.user.user_type == 'center_admin' and request.user.center:
            return queryset.filter(center=request.user.center)
        return queryset


class CircularForHeadOfficeViewSet(viewsets.ModelViewSet):
    queryset = Circular.objects.select_related(
        'center', 'course', 'created_by',
    ).all()
    permission_classes = (permissions.IsAuthenticated, IsHeadOffice)
    filter_backends = (DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter)
    filterset_fields = ('center', 'course', 'status')
    search_fields = ('title_bn', 'title_en')
    ordering_fields = ('created_at', 'application_start_date', 'total_seats')
    ordering = ('-created_at',)

    def get_serializer_class(self):
        if self.action == 'list':
            return CircularListSerializer
        if self.action in ('create', 'update', 'partial_update'):
            return CircularWriteSerializer
        return CircularDetailSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        circular = self.get_object()
        if circular.status != Circular.Status.DRAFT:
            return Response({'error': 'শুধুমাত্র খসড়া অবস্থায় প্রকাশ করা যাবে'}, status=400)
        circular.status = Circular.Status.PUBLISHED
        circular.save()
        return Response(CircularDetailSerializer(circular).data)

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        circular = self.get_object()
        if circular.status != Circular.Status.PUBLISHED:
            return Response({'error': 'শুধুমাত্র প্রকাশিত সার্কুলার বন্ধ করা যাবে'}, status=400)
        circular.status = Circular.Status.CLOSED
        circular.save()
        return Response(CircularDetailSerializer(circular).data)


class CircularForCenterAdminViewSet(viewsets.ModelViewSet):
    serializer_class = CircularWriteSerializer
    permission_classes = (permissions.IsAuthenticated, IsHeadOfficeOrCenterAdmin)
    filter_backends = (DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter)
    filterset_fields = ('course', 'status')
    search_fields = ('title_bn', 'title_en')
    ordering = ('-created_at',)

    def get_serializer_class(self):
        if self.action == 'list':
            return CircularListSerializer
        if self.action in ('create', 'update', 'partial_update'):
            return CircularWriteSerializer
        return CircularDetailSerializer

    def get_queryset(self):
        qs = Circular.objects.select_related('center', 'course', 'created_by').all()
        if self.request.user.user_type == 'center_admin' and self.request.user.center:
            qs = qs.filter(center=self.request.user.center)
        return qs

    def perform_create(self, serializer):
        center = self.request.user.center
        if not center:
            return Response({'error': 'আপনার কোনো কেন্দ্র নির্ধারিত নেই'}, status=400)
        serializer.save(created_by=self.request.user, center=center)


class PublicCircularViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PublicCircularSerializer
    permission_classes = (permissions.AllowAny,)
    filter_backends = (DjangoFilterBackend, filters.SearchFilter)
    filterset_fields = ('center__code', 'course', 'status')
    search_fields = ('title_bn', 'title_en')

    def get_queryset(self):
        now = timezone.now().date()
        return Circular.objects.filter(
            status=Circular.Status.PUBLISHED,
            application_start_date__lte=now,
        ).select_related('center', 'course').all()

    @action(detail=False, methods=['get'], url_path='by-center/(?P<code>[^/.]+)')
    def by_center(self, request, code=None):
        qs = self.get_queryset().filter(center__code__iexact=code)
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path=r'by-url/(?P<slug>[^/.]+)')
    def by_url(self, request, slug=None):
        try:
            circular = Circular.objects.get(
                public_url=slug,
                status=Circular.Status.PUBLISHED,
            )
            return Response(PublicCircularSerializer(circular).data)
        except Circular.DoesNotExist:
            return Response({'error': 'সার্কুলার পাওয়া যায়নি'}, status=404)
