from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views_ho_centers import HOCenterViewSet, HOInfrastructureViewSet, HOEmployeeViewSet

router = DefaultRouter()
router.register(r'centers', HOCenterViewSet, basename='ho-center')
router.register(r'infrastructures', HOInfrastructureViewSet, basename='ho-infrastructure')
router.register(r'employees', HOEmployeeViewSet, basename='ho-employee')

urlpatterns = [
    path('', include(router.urls)),
]
