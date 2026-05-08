from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views_center_dashboard import CenterDashboardViewSet

router = DefaultRouter()
router.register(r'dashboard', CenterDashboardViewSet, basename='center-dashboard')

urlpatterns = [
    path('', include(router.urls)),
]
