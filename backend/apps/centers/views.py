from rest_framework import viewsets, filters
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
    queryset = Center.objects.prefetch_related('infrastructures', 'employees').all()
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
    queryset = Infrastructure.objects.select_related('center').all()
    serializer_class = InfrastructureSerializer
    filter_backends = (DjangoFilterBackend, filters.SearchFilter)
    filterset_fields = ('center', 'status')
    search_fields = ('room_no', 'location_bn', 'location_en')


class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.select_related('user', 'center').all()
    serializer_class = EmployeeSerializer
    filter_backends = (DjangoFilterBackend, filters.SearchFilter)
    filterset_fields = ('center', 'status', 'is_contact_person')
    search_fields = ('employee_no', 'user__full_name_bn', 'user__full_name_en', 'designation_bn')
