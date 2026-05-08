from django.urls import path
from .views_public import verify_certificate

urlpatterns = [
    path('verify-certificate/<str:cert_no>/', verify_certificate, name='public-verify-certificate'),
]
