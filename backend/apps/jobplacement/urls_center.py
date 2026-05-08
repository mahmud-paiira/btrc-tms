from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views_center import CenterJobPlacementViewSet

router = DefaultRouter()
router.register(r'jobs', CenterJobPlacementViewSet, basename='center-job')

urlpatterns = [
    path('', include(router.urls)),
]
