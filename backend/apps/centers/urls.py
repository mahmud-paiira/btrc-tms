from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CenterViewSet, InfrastructureViewSet, EmployeeViewSet

router = DefaultRouter()
router.register(r'', CenterViewSet, basename='center')
router.register(r'infrastructures', InfrastructureViewSet, basename='infrastructure')
router.register(r'employees', EmployeeViewSet, basename='employee')

urlpatterns = [
    path('', include(router.urls)),
]
