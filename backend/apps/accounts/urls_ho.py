from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views_ho import HOUserViewSet, HORoleViewSet

router = DefaultRouter()
router.register(r'users', HOUserViewSet, basename='ho-user')
router.register(r'roles', HORoleViewSet, basename='ho-role')

urlpatterns = [
    path('', include(router.urls)),
]
