from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views_ho import NIDAccessLogViewSet

router = DefaultRouter()
router.register('nid-access-logs', NIDAccessLogViewSet, basename='nid-access-log')

urlpatterns = [
    path('', include(router.urls)),
]
