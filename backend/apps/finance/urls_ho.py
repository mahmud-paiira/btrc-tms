from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views_ho import HOBudgetViewSet, HOVoucherViewSet

router = DefaultRouter()
router.register(r'finance/budgets', HOBudgetViewSet, basename='ho-budget')
router.register(r'finance/vouchers', HOVoucherViewSet, basename='ho-voucher')

urlpatterns = [
    path('', include(router.urls)),
]
