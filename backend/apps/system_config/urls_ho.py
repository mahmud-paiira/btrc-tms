from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views_ho import HOSystemConfigViewSet

router = DefaultRouter()
router.register(r'', HOSystemConfigViewSet, basename='ho-system')

urlpatterns = [
    path('', include(router.urls)),
]
