from rest_framework import viewsets, filters, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Center, Infrastructure, Employee
from .serializers import (
    CenterListSerializer,
    CenterDetailSerializer,
    InfrastructureSerializer,
    EmployeeSerializer,
)


class CenterViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser or user.user_type == 'head_office':
            return Center.objects.prefetch_related('infrastructures', 'employees').all()
        if user.center:
            return Center.objects.prefetch_related('infrastructures', 'employees').filter(id=user.center.id)
        return Center.objects.none()

    filter_backends = (DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter)
    filterset_fields = ('status',)
    search_fields = ('code', 'name_bn', 'name_en', 'phone', 'email')
    ordering_fields = ('code', 'name_en', 'created_at')
    ordering = ('name_en',)

    def get_serializer_class(self):
        if self.action == 'list':
            return CenterListSerializer
        return CenterDetailSerializer

    @action(detail=True, methods=['get'])
    def summary(self, request, pk=None):
        center = self.get_object()
        return Response({
            'id': center.id,
            'code': center.code,
            'name_bn': center.name_bn,
            'name_en': center.name_en,
            'status': center.status,
            'total_rooms': center.infrastructures.count(),
            'total_employees': center.employees.count(),
        })


class InfrastructureViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser or user.user_type == 'head_office':
            return Infrastructure.objects.select_related('center').all()
        if user.center:
            return Infrastructure.objects.select_related('center').filter(center=user.center)
        return Infrastructure.objects.none()

    serializer_class = InfrastructureSerializer
    filter_backends = (DjangoFilterBackend, filters.SearchFilter)
    filterset_fields = ('center', 'status')
    search_fields = ('room_no', 'location_bn', 'location_en')


class EmployeeViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser or user.user_type == 'head_office':
            return Employee.objects.select_related('user', 'center').all()
        if user.center:
            return Employee.objects.select_related('user', 'center').filter(center=user.center)
        return Employee.objects.none()

    serializer_class = EmployeeSerializer
    filter_backends = (DjangoFilterBackend, filters.SearchFilter)
    filterset_fields = ('center', 'status', 'is_contact_person')
    search_fields = ('employee_no', 'user__full_name_bn', 'user__full_name_en', 'designation_bn')
