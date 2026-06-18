import csv
import io
from datetime import date

import openpyxl
from django.http import HttpResponse
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from .models import Trainee
from .serializers import TraineeListSerializer


class IsHeadOffice(IsAuthenticated):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and (
            request.user.user_type == 'head_office' or request.user.is_superuser
        )


class HOTraineeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Trainee.objects.select_related(
        'user', 'center', 'batch'
    ).all()
    permission_classes = [IsHeadOffice]
    serializer_class = TraineeListSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ('center', 'batch', 'status')
    search_fields = (
        'registration_no', 'user__full_name_bn', 'user__full_name_en',
        'user__email', 'user__phone', 'user__nid',
    )
    ordering_fields = ('enrollment_date', 'registration_no', 'status', 'center__name_bn')
    ordering = ('-enrollment_date',)

    @action(detail=False, methods=['get'], url_path='export-list')
    def export_list(self, request):
        qs = self.filter_queryset(self.get_queryset())
        ids = request.query_params.get('ids', '')
        if ids:
            id_list = [int(x) for x in ids.split(',') if x.isdigit()]
            if id_list:
                qs = qs.filter(id__in=id_list)
        fmt = request.query_params.get('file_format', 'xlsx')

        headers = [
            'রেজি. নং', 'নাম (বাংলা)', 'নাম (ইংরেজি)', 'ইমেইল', 'ফোন',
            'এনআইডি', 'কেন্দ্র', 'ব্যাচ', 'অবস্থা', 'নথিভুক্তির তারিখ',
        ]
        rows = []
        for t in qs:
            rows.append([
                t.registration_no, t.user.full_name_bn, t.user.full_name_en,
                t.user.email, t.user.phone, t.user.nid or '',
                t.center.name_bn if t.center else '',
                t.batch.batch_name_bn if t.batch else '',
                t.get_status_display() if t.status else '',
                t.enrollment_date.strftime('%Y-%m-%d') if t.enrollment_date else '',
            ])

        if fmt == 'xlsx':
            wb = openpyxl.Workbook()
            ws = wb.active
            ws.title = 'Trainees'
            ws.append(headers)
            for row in rows:
                ws.append(row)
            output = io.BytesIO()
            wb.save(output)
            output.seek(0)
            response = HttpResponse(
                output.getvalue(),
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            )
            response['Content-Disposition'] = f'attachment; filename="trainees_{date.today().isoformat()}.xlsx"'
            return response
        else:
            output = io.StringIO()
            writer = csv.writer(output)
            writer.writerow(headers)
            for row in rows:
                writer.writerow(row)
            response = HttpResponse(
                output.getvalue().encode('utf-8-sig'),
                content_type='text/csv',
            )
            response['Content-Disposition'] = f'attachment; filename="trainees_{date.today().isoformat()}.csv"'
            return response
