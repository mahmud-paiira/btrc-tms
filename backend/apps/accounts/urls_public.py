from django.urls import path
from .views_public import (
    public_register, public_verify_otp,
    public_resend_otp, public_check_user,
    public_login,
)

urlpatterns = [
    path('register/', public_register, name='public-register'),
    path('verify-otp/', public_verify_otp, name='public-verify-otp'),
    path('resend-otp/', public_resend_otp, name='public-resend-otp'),
    path('check-user/', public_check_user, name='public-check-user'),
    path('login/', public_login, name='public-login'),
]
