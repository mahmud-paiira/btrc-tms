from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views_center import CenterCertificateViewSet

router = DefaultRouter()
router.register(r'certificates', CenterCertificateViewSet, basename='center-certificate')

urlpatterns = [
    path('', include(router.urls)),
]
