from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views_ho import HeadOfficeDashboardViewSet

router = DefaultRouter()
router.register(r'dashboard', HeadOfficeDashboardViewSet, basename='ho-dashboard')

urlpatterns = [
    path('', include(router.urls)),
]
