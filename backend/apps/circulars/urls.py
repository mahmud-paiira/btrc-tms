from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CircularForHeadOfficeViewSet,
    CircularForCenterAdminViewSet,
    PublicCircularViewSet,
)

head_office_router = DefaultRouter()
head_office_router.register(
    r'head-office', CircularForHeadOfficeViewSet, basename='circular-head-office',
)

center_admin_router = DefaultRouter()
center_admin_router.register(
    r'center-admin', CircularForCenterAdminViewSet, basename='circular-center-admin',
)

public_router = DefaultRouter()
public_router.register(
    r'public', PublicCircularViewSet, basename='circular-public',
)

urlpatterns = [
    path('', include(head_office_router.urls)),
    path('', include(center_admin_router.urls)),
    path('', include(public_router.urls)),
]
