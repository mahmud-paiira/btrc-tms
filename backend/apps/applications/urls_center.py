from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views_center import ApplicationCenterViewSet

router = DefaultRouter()
router.register(r'applications', ApplicationCenterViewSet, basename='center-application')

urlpatterns = [
    path('', include(router.urls)),
]
