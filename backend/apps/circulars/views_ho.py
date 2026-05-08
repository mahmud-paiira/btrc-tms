from datetime import timedelta
from django.db.models import Count, Q, Avg, F
from django.utils import timezone
from rest_framework import viewsets, status, permissions, filters as drf_filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from .models import Circular
from .serializers import (
    CircularListSerializer, CircularDetailSerializer, CircularWriteSerializer,
)
from apps.applications.models import Application
from apps.applications.serializers import ApplicationDetailSerializer as ApplicationSerializer
from apps.centers.models import ActionLog


class IsHeadOffice(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.user_type == 'head_office' or request.user.is_superuser


class HOCircularViewSet(viewsets.ModelViewSet):
    queryset = Circular.objects.select_related(
        'center', 'course', 'created_by',
    ).prefetch_related('applications').all()
    permission_classes = [permissions.IsAuthenticated, IsHeadOffice]
    filter_backends = (DjangoFilterBackend, drf_filters.SearchFilter, drf_filters.OrderingFilter)
    filterset_fields = ('center', 'course', 'status')
    search_fields = ('title_bn', 'title_en')
    ordering_fields = ('created_at', 'application_start_date', 'total_seats', 'status')
    ordering = ('-created_at',)

    def get_serializer_class(self):
        if self.action == 'list':
            return CircularListSerializer
        if self.action in ('create', 'update', 'partial_update'):
            return CircularWriteSerializer
        return CircularDetailSerializer

    def _log(self, request, action_desc, target_id=None):
        ActionLog.objects.create(
            user=request.user,
            action=action_desc,
            target_type='Circular',
            target_id=str(target_id) if target_id else '',
            description=action_desc,
            ip_address=request.META.get('REMOTE_ADDR', ''),
        )

    def perform_create(self, serializer):
        obj = serializer.save(created_by=self.request.user)
        self._log(self.request, f'Created circular {obj.title_bn}', obj.id)

    def perform_update(self, serializer):
        obj = serializer.save()
        self._log(self.request, f'Updated circular {obj.title_bn}', obj.id)

    def perform_destroy(self, instance):
        self._log(self.request, f'Deleted circular {instance.title_bn}', instance.id)
        instance.delete()

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        circular = self.get_object()
        if circular.status != Circular.Status.DRAFT:
            return Response({'error': 'শুধুমাত্র খসড়া অবস্থায় প্রকাশ করা যাবে'}, status=400)
        circular.status = Circular.Status.PUBLISHED
        circular.published_at = timezone.now()
        circular.save(update_fields=['status', 'published_at'])
        self._log(request, f'Published circular {circular.title_bn}', circular.id)
        return Response(CircularDetailSerializer(circular).data)

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        circular = self.get_object()
        if circular.status != Circular.Status.PUBLISHED:
            return Response({'error': 'শুধুমাত্র প্রকাশিত সার্কুলার বন্ধ করা যাবে'}, status=400)
        circular.status = Circular.Status.CLOSED
        circular.save(update_fields=['status'])
        self._log(request, f'Closed circular {circular.title_bn}', circular.id)
        return Response(CircularDetailSerializer(circular).data)

    @action(detail=True, methods=['post'])
    def extend(self, request, pk=None):
        circular = self.get_object()
        days = request.data.get('days', 7)
        if circular.status != Circular.Status.PUBLISHED:
            return Response({'error': 'শুধুমাত্র প্রকাশিত সার্কুলারের মেয়াদ বাড়ানো যাবে'}, status=400)
        try:
            days = int(days)
        except (TypeError, ValueError):
            return Response({'error': 'days must be an integer'}, status=400)
        circular.application_end_date += timedelta(days=days)
        circular.save(update_fields=['application_end_date'])
        self._log(request, f'Extended circular {circular.title_bn} by {days} days', circular.id)
        return Response(CircularDetailSerializer(circular).data)

    @action(detail=True, methods=['get'])
    def analytics(self, request, pk=None):
        circular = self.get_object()
        apps = Application.objects.filter(circular=circular)
        total = apps.count()
        reviewed = apps.exclude(reviewed_at__isnull=True)

        applications_by_gender = {}
        for app in apps.select_related('user__profile'):
            try:
                g = app.user.profile.gender if app.user and hasattr(app.user, 'profile') else 'unknown'
            except Exception:
                g = 'unknown'
            applications_by_gender[g] = applications_by_gender.get(g, 0) + 1

        from datetime import date
        today = date.today()
        age_groups = {'18-25': 0, '26-35': 0, '36-45': 0, '46+': 0}
        for app in apps.only('date_of_birth'):
            if app.date_of_birth:
                age = today.year - app.date_of_birth.year - (
                    (today.month, today.day) < (app.date_of_birth.month, app.date_of_birth.day)
                )
                if age <= 25:
                    age_groups['18-25'] += 1
                elif age <= 35:
                    age_groups['26-35'] += 1
                elif age <= 45:
                    age_groups['36-45'] += 1
                else:
                    age_groups['46+'] += 1

        applications_by_district = {}
        for app in apps.only('permanent_address'):
            addr = (app.permanent_address or '').strip()
            if addr:
                parts = [p.strip() for p in addr.split(',')]
                district = parts[-1] if len(parts) > 1 else addr
                applications_by_district[district] = applications_by_district.get(district, 0) + 1

        selected = apps.filter(status=Application.ApplicationStatus.SELECTED).count()
        selection_rate = round((selected / total * 100), 1) if total else 0

        avg_response_time = None
        if reviewed.count() > 0:
            delta = reviewed.annotate(
                resp_time=Avg(F('reviewed_at') - F('applied_at'))
            ).aggregate(avg=Avg('resp_time'))['avg']
            if delta:
                avg_response_time = round(delta.total_seconds() / 3600, 1)

        status_counts = apps.values('status').annotate(count=Count('id'))

        return Response({
            'applications_received': total,
            'applications_by_gender': applications_by_gender,
            'applications_by_age_group': age_groups,
            'applications_by_district': dict(sorted(
                applications_by_district.items(), key=lambda x: x[1], reverse=True,
            )[:15]),
            'selection_rate': selection_rate,
            'average_response_time_hours': avg_response_time,
            'status_breakdown': {s['status']: s['count'] for s in status_counts},
        })

    @action(detail=True, methods=['get'])
    def applications(self, request, pk=None):
        circular = self.get_object()
        qs = Application.objects.filter(circular=circular).select_related(
            'user', 'reviewed_by',
        ).order_by('-applied_at')

        status_filter = request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)

        search_q = request.query_params.get('search', '')
        if search_q:
            qs = qs.filter(
                Q(name_bn__icontains=search_q) |
                Q(name_en__icontains=search_q) |
                Q(application_no__icontains=search_q) |
                Q(nid__icontains=search_q) |
                Q(phone__icontains=search_q)
            )

        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = ApplicationSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = ApplicationSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def approve_application(self, request, pk=None):
        circular = self.get_object()
        app_id = request.data.get('application_id')
        if not app_id:
            return Response({'error': 'application_id required'}, status=400)
        try:
            app = Application.objects.get(id=app_id, circular=circular)
        except Application.DoesNotExist:
            return Response({'error': 'আবেদন পাওয়া যায়নি'}, status=404)
        app.status = Application.ApplicationStatus.SELECTED
        app.reviewed_by = request.user
        app.reviewed_at = timezone.now()
        app.save(update_fields=['status', 'reviewed_by', 'reviewed_at'])
        if circular.remaining_seats > 0:
            circular.remaining_seats -= 1
            circular.save(update_fields=['remaining_seats'])
        self._log(request, f'Approved application {app.application_no}', app.id)
        return Response(ApplicationSerializer(app).data)

    @action(detail=True, methods=['post'])
    def reject_application(self, request, pk=None):
        app_id = request.data.get('application_id')
        remarks = request.data.get('remarks', '')
        if not app_id:
            return Response({'error': 'application_id required'}, status=400)
        try:
            app = Application.objects.get(id=app_id, circular=self.get_object())
        except Application.DoesNotExist:
            return Response({'error': 'আবেদন পাওয়া যায়নি'}, status=404)
        app.status = Application.ApplicationStatus.REJECTED
        app.reviewed_by = request.user
        app.reviewed_at = timezone.now()
        app.remarks = remarks
        app.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'remarks'])
        self._log(request, f'Rejected application {app.application_no}', app.id)
        return Response(ApplicationSerializer(app).data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        total = Circular.objects.count()
        published = Circular.objects.filter(status=Circular.Status.PUBLISHED).count()
        draft = Circular.objects.filter(status=Circular.Status.DRAFT).count()
        closed = Circular.objects.filter(status=Circular.Status.CLOSED).count()
        total_apps = Application.objects.count()
        active_apps = Application.objects.filter(status=Application.ApplicationStatus.PENDING).count()
        total_seats = Circular.objects.aggregate(s=Count('total_seats'))['s'] or 0
        return Response({
            'total_circulars': total,
            'published': published,
            'draft': draft,
            'closed': closed,
            'total_applications': total_apps,
            'active_applications': active_apps,
            'total_seats': total_seats,
        })
