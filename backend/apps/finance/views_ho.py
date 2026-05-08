import logging
from decimal import Decimal
from datetime import date

from django.db.models import Sum, Q, F, Value, OuterRef, Subquery
from django.db.models.functions import Coalesce
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets, permissions, status, filters as drf_filters
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.centers.models import ActionLog, Center
from .models import Budget, Voucher, VoucherItem, MakerCheckerApprover
from .serializers import (
    BudgetListSerializer, BudgetDetailSerializer, BudgetWriteSerializer,
    VoucherListSerializer, VoucherDetailSerializer, VoucherWriteSerializer,
    UtilizationReportSerializer, SoEResponseSerializer,
    TrialBalanceItemSerializer, LedgerEntrySerializer,
)

logger = logging.getLogger(__name__)


class IsHeadOffice(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.user_type == 'head_office' or request.user.is_superuser


class HOBudgetViewSet(viewsets.ModelViewSet):
    queryset = Budget.objects.select_related('center', 'course', 'created_by').all()
    permission_classes = [permissions.IsAuthenticated, IsHeadOffice]
    filter_backends = (DjangoFilterBackend, drf_filters.SearchFilter, drf_filters.OrderingFilter)
    filterset_fields = ('center', 'fiscal_year', 'course')
    search_fields = ('center__name_bn', 'center__code', 'fiscal_year', 'notes')
    ordering_fields = ('fiscal_year', 'allocated_amount', 'expended_amount', 'created_at')
    ordering = ('-fiscal_year', 'center__code')

    def get_serializer_class(self):
        if self.action == 'list':
            return BudgetListSerializer
        if self.action in ('create', 'update', 'partial_update'):
            return BudgetWriteSerializer
        return BudgetDetailSerializer

    def perform_create(self, serializer):
        obj = serializer.save(created_by=self.request.user)
        ActionLog.objects.create(
            user=self.request.user,
            action='created budget',
            target_type='Budget',
            target_id=str(obj.id),
            description=f'বাজেট তৈরি: {obj.center.code} - {obj.fiscal_year} - {obj.allocated_amount}',
            ip_address=self.request.META.get('REMOTE_ADDR', ''),
        )

    def perform_update(self, serializer):
        obj = serializer.save()
        ActionLog.objects.create(
            user=self.request.user,
            action='updated budget',
            target_type='Budget',
            target_id=str(obj.id),
            description=f'বাজেট হালনাগাদ: {obj.center.code} - {obj.fiscal_year}',
            ip_address=self.request.META.get('REMOTE_ADDR', ''),
        )

    @action(detail=False, methods=['get'])
    def utilization(self, request):
        fiscal_year = request.query_params.get('fiscal_year')
        center_id = request.query_params.get('center_id')

        filters = Q()
        if fiscal_year:
            filters &= Q(fiscal_year=fiscal_year)
        if center_id:
            filters &= Q(center_id=center_id)

        budgets = Budget.objects.filter(filters).values(
            'center__code', 'center__name_bn',
        ).annotate(
            allocated_amount=Sum('allocated_amount'),
            expended_amount=Sum('expended_amount'),
        ).order_by('center__code')

        data = []
        for b in budgets:
            allocated = b['allocated_amount'] or Decimal('0')
            expended = b['expended_amount'] or Decimal('0')
            pct = float(expended / allocated * 100) if allocated else 0
            data.append({
                'center_code': b['center__code'],
                'center_name': b['center__name_bn'],
                'allocated_amount': allocated,
                'expended_amount': expended,
                'utilization_pct': round(pct, 1),
            })

        serializer = UtilizationReportSerializer(data, many=True)
        return Response(serializer.data)


class HOVoucherViewSet(viewsets.ModelViewSet):
    queryset = Voucher.objects.select_related(
        'center', 'created_by',
    ).prefetch_related('items').all()
    permission_classes = [permissions.IsAuthenticated, IsHeadOffice]
    filter_backends = (DjangoFilterBackend, drf_filters.SearchFilter, drf_filters.OrderingFilter)
    filterset_fields = ('voucher_type', 'status', 'center', 'voucher_date')
    search_fields = ('voucher_no', 'description')
    ordering_fields = ('voucher_date', 'amount', 'created_at')
    ordering = ('-voucher_date',)

    def get_serializer_class(self):
        if self.action == 'list':
            return VoucherListSerializer
        if self.action == 'retrieve':
            return VoucherDetailSerializer
        if self.action in ('create', 'update', 'partial_update'):
            return VoucherWriteSerializer
        return VoucherDetailSerializer

    def perform_create(self, serializer):
        today = date.today()
        count_today = Voucher.objects.filter(
            created_at__date=today,
        ).count()
        voucher_no = f'V-{today.strftime("%Y%m%d")}-{count_today + 1:04d}'
        voucher = serializer.save(
            created_by=self.request.user,
            voucher_no=voucher_no,
        )
        MakerCheckerApprover.objects.create(
            voucher=voucher,
            maker=self.request.user,
            maker_date=__import__('django').utils.timezone.now(),
        )
        ActionLog.objects.create(
            user=self.request.user,
            action='created voucher',
            target_type='Voucher',
            target_id=str(voucher.id),
            description=f'ভাউচার তৈরি: {voucher.voucher_no} - {voucher.amount}',
            ip_address=self.request.META.get('REMOTE_ADDR', ''),
        )

    @action(detail=True, methods=['put'])
    def verify(self, request, pk=None):
        voucher = self.get_object()
        if voucher.status != Voucher.VoucherStatus.DRAFT:
            return Response(
                {'error': 'শুধুমাত্র খসড়া অবস্থায় যাচাই করা যাবে'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        voucher.status = Voucher.VoucherStatus.VERIFIED
        voucher.save(update_fields=['status'])
        try:
            wf = voucher.workflow
            wf.checker = request.user
            wf.checker_date = __import__('django').utils.timezone.now()
            wf.save(update_fields=['checker', 'checker_date'])
        except MakerCheckerApprover.DoesNotExist:
            pass
        ActionLog.objects.create(
            user=self.request.user,
            action='verified voucher',
            target_type='Voucher',
            target_id=str(voucher.id),
            description=f'ভাউচার যাচাই: {voucher.voucher_no}',
            ip_address=self.request.META.get('REMOTE_ADDR', ''),
        )
        serializer = VoucherDetailSerializer(voucher)
        return Response(serializer.data)

    @action(detail=True, methods=['put'])
    def approve(self, request, pk=None):
        voucher = self.get_object()
        if voucher.status != Voucher.VoucherStatus.VERIFIED:
            return Response(
                {'error': 'শুধুমাত্র যাচাইকৃত অবস্থায় অনুমোদন দেওয়া যাবে'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        voucher.status = Voucher.VoucherStatus.APPROVED
        voucher.save(update_fields=['status'])
        try:
            wf = voucher.workflow
            wf.approver = request.user
            wf.approver_date = __import__('django').utils.timezone.now()
            wf.save(update_fields=['approver', 'approver_date'])
        except MakerCheckerApprover.DoesNotExist:
            pass
        ActionLog.objects.create(
            user=self.request.user,
            action='approved voucher',
            target_type='Voucher',
            target_id=str(voucher.id),
            description=f'ভাউচার অনুমোদন: {voucher.voucher_no}',
            ip_address=self.request.META.get('REMOTE_ADDR', ''),
        )
        serializer = VoucherDetailSerializer(voucher)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def soe(self, request):
        from_date = request.query_params.get('from_date')
        to_date = request.query_params.get('to_date')
        center_id = request.query_params.get('center_id')
        fiscal_year = request.query_params.get('fiscal_year')

        filters = Q(status=Voucher.VoucherStatus.APPROVED)
        if from_date:
            filters &= Q(voucher_date__gte=from_date)
        if to_date:
            filters &= Q(voucher_date__lte=to_date)
        if center_id:
            filters &= Q(center_id=center_id)
        if fiscal_year:
            filters &= Q(voucher_date__year=fiscal_year)

        vouchers = Voucher.objects.filter(filters).select_related(
            'center', 'workflow__approver',
        ).order_by('voucher_date')

        data = []
        for v in vouchers:
            approved_by = None
            try:
                if v.workflow and v.workflow.approver:
                    approved_by = v.workflow.approver.full_name_bn
            except MakerCheckerApprover.DoesNotExist:
                pass
            data.append({
                'voucher_date': v.voucher_date,
                'voucher_no': v.voucher_no,
                'description': v.description,
                'amount': v.amount,
                'approved_by': approved_by,
                'center_name': v.center.name_bn if v.center else None,
            })

        total = sum(d['amount'] for d in data)
        serializer = SoEResponseSerializer(data, many=True)
        return Response({
            'items': serializer.data,
            'total_expenditure': total,
            'count': len(data),
        })

    @action(detail=False, methods=['get'])
    def trial_balance(self, request):
        items = VoucherItem.objects.filter(
            voucher__status=Voucher.VoucherStatus.APPROVED,
        ).values('account_head').annotate(
            total_debit=Coalesce(Sum('debit_amount'), Value(Decimal('0'))),
            total_credit=Coalesce(Sum('credit_amount'), Value(Decimal('0'))),
        ).order_by('account_head')

        data = []
        for item in items:
            debit = item['total_debit']
            credit = item['total_credit']
            data.append({
                'account_head': item['account_head'],
                'total_debit': debit,
                'total_credit': credit,
                'balance': debit - credit,
            })

        serializer = TrialBalanceItemSerializer(data, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path=r'ledger/(?P<account_head>.+)')
    def ledger(self, request, account_head=None):
        if not account_head:
            return Response(
                {'error': 'হিসাব শিরোনাম প্রদান করুন'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        items = VoucherItem.objects.filter(
            account_head__icontains=account_head,
            voucher__status=Voucher.VoucherStatus.APPROVED,
        ).select_related('voucher').order_by('voucher__voucher_date', 'voucher__voucher_no')

        running_balance = Decimal('0')
        data = []
        for item in items:
            running_balance += (item.debit_amount or Decimal('0')) - (item.credit_amount or Decimal('0'))
            data.append({
                'voucher_no': item.voucher.voucher_no,
                'voucher_date': item.voucher.voucher_date,
                'description': item.description or item.voucher.description,
                'debit_amount': item.debit_amount,
                'credit_amount': item.credit_amount,
                'running_balance': running_balance,
            })

        serializer = LedgerEntrySerializer(data, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        total_vouchers = Voucher.objects.count()
        draft_count = Voucher.objects.filter(status=Voucher.VoucherStatus.DRAFT).count()
        verified_count = Voucher.objects.filter(status=Voucher.VoucherStatus.VERIFIED).count()
        approved_count = Voucher.objects.filter(status=Voucher.VoucherStatus.APPROVED).count()
        total_amount = Voucher.objects.filter(
            status=Voucher.VoucherStatus.APPROVED,
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

        total_budget = Budget.objects.aggregate(
            total=Sum('allocated_amount'),
        )['total'] or Decimal('0')
        total_expended = Budget.objects.aggregate(
            total=Sum('expended_amount'),
        )['total'] or Decimal('0')

        return Response({
            'total_vouchers': total_vouchers,
            'draft_count': draft_count,
            'verified_count': verified_count,
            'approved_count': approved_count,
            'total_budget': total_budget,
            'total_expenditure': total_expended,
            'remaining_budget': total_budget - total_expended,
            'pending_approvals': verified_count,
        })
