from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views_ho import HOCircularViewSet

router = DefaultRouter()
router.register(r'circulars', HOCircularViewSet, basename='ho-circular')

urlpatterns = [
    path('', include(router.urls)),
]
