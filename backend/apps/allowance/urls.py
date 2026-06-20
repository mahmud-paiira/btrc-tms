from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AllowanceCategoryViewSet, AllowanceTierViewSet, TraineeAllowanceViewSet

router = DefaultRouter()
router.register(r'categories', AllowanceCategoryViewSet)
router.register(r'tiers', AllowanceTierViewSet)
router.register(r'allowances', TraineeAllowanceViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
