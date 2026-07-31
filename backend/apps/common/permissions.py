from rest_framework.permissions import BasePermission


class IsHeadOfficeOrSuperuser(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return (
            request.user.user_type == 'head_office'
            or request.user.is_superuser
        )


class IsAdminOrHeadOffice(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return (
            request.user.user_type in ('head_office', 'center_admin')
            or request.user.is_superuser
        )


class IsReadOnlyOrAdmin(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in ('GET', 'HEAD', 'OPTIONS'):
            return True
        return (
            request.user.user_type in ('head_office', 'center_admin')
            or request.user.is_superuser
        )
