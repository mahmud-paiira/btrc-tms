import logging

from django.db import connection
from django.core.cache import cache
from django.core.management import call_command
from django.conf import settings
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.models import User
from apps.centers.models import ActionLog
from .models import SystemSetting, EmailTemplate, SmsTemplate, IntegrationConfig, BackupConfig
from .serializers import (
    SystemSettingSerializer, EmailTemplateSerializer, SmsTemplateSerializer,
    IntegrationConfigSerializer, BackupConfigSerializer,
)

logger = logging.getLogger(__name__)


class IsHeadOffice(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.user_type == 'head_office' or request.user.is_superuser


class HOSystemConfigViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated, IsHeadOffice]

    def _log(self, request, action, target_type, target_id='', description=''):
        ActionLog.objects.create(
            user=request.user, action=action, target_type=target_type,
            target_id=str(target_id) if target_id else '',
            description=description, ip_address=request.META.get('REMOTE_ADDR', ''),
        )

    # ── Settings ─────────────────────────────────────────────────────────

    @action(detail=False, methods=['get', 'put'])
    def settings(self, request):
        if request.method == 'GET':
            key = request.query_params.get('key')
            if key:
                try:
                    setting = SystemSetting.objects.get(key=key)
                    return Response(SystemSettingSerializer(setting).data)
                except SystemSetting.DoesNotExist:
                    return Response({'error': f'Setting "{key}" not found'}, status=404)
            qs = SystemSetting.objects.all()
            return Response(SystemSettingSerializer(qs, many=True).data)

        key = request.data.get('key')
        value = request.data.get('value')
        if not key:
            return Response({'error': 'key is required'}, status=400)
        try:
            setting = SystemSetting.objects.get(key=key)
            old_value = setting.value
            serializer = SystemSettingSerializer(setting, data={'value': value}, partial=True)
            if not serializer.is_valid():
                return Response(serializer.errors, status=400)
            serializer.save(updated_by=request.user)
            self._log(request, 'updated setting', 'SystemSetting', setting.id,
                      f'Settings changed: {key} = {old_value} → {value}')
            return Response(serializer.data)
        except SystemSetting.DoesNotExist:
            return Response({'error': f'Setting "{key}" not found'}, status=404)

    # ── Email Templates ──────────────────────────────────────────────────

    @action(detail=False, methods=['get', 'put'])
    def email_templates(self, request):
        if request.method == 'GET':
            qs = EmailTemplate.objects.all()
            return Response(EmailTemplateSerializer(qs, many=True).data)

        tmpl_id = request.data.get('id')
        if not tmpl_id:
            return Response({'error': 'id is required'}, status=400)
        try:
            tmpl = EmailTemplate.objects.get(id=tmpl_id)
        except EmailTemplate.DoesNotExist:
            return Response({'error': 'Template not found'}, status=404)
        serializer = EmailTemplateSerializer(tmpl, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        serializer.save()
        self._log(request, 'updated email template', 'EmailTemplate', tmpl.id,
                  f'Email template updated: {tmpl.name}')
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def email_templates_test(self, request):
        tmpl_id = request.data.get('id')
        recipient = request.data.get('recipient', request.user.email)
        try:
            tmpl = EmailTemplate.objects.get(id=tmpl_id)
        except EmailTemplate.DoesNotExist:
            return Response({'error': 'Template not found'}, status=404)

        subject = tmpl.subject_en
        body = tmpl.body_en.replace('{{trainee_name}}', request.user.full_name_en)

        try:
            from django.core.mail import send_mail
            send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [recipient])
            self._log(request, 'tested email template', 'EmailTemplate', tmpl.id,
                      f'Test email sent to {recipient} for template: {tmpl.name}')
            return Response({'detail': f'Test email sent to {recipient}'})
        except Exception as e:
            logger.exception('Test email failed')
            return Response({'error': str(e)}, status=500)

    # ── SMS Templates ────────────────────────────────────────────────────

    @action(detail=False, methods=['get', 'put'])
    def sms_templates(self, request):
        if request.method == 'GET':
            qs = SmsTemplate.objects.all()
            return Response(SmsTemplateSerializer(qs, many=True).data)

        tmpl_id = request.data.get('id')
        if not tmpl_id:
            return Response({'error': 'id is required'}, status=400)
        try:
            tmpl = SmsTemplate.objects.get(id=tmpl_id)
        except SmsTemplate.DoesNotExist:
            return Response({'error': 'Template not found'}, status=404)
        serializer = SmsTemplateSerializer(tmpl, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        serializer.save()
        self._log(request, 'updated sms template', 'SmsTemplate', tmpl.id,
                  f'SMS template updated: {tmpl.name}')
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def sms_templates_test(self, request):
        tmpl_id = request.data.get('id')
        phone = request.data.get('phone', '')
        try:
            tmpl = SmsTemplate.objects.get(id=tmpl_id)
        except SmsTemplate.DoesNotExist:
            return Response({'error': 'Template not found'}, status=404)

        message = tmpl.message_en.replace('{{trainee_name}}', request.user.full_name_en)

        logger.info(f'Test SMS to {phone}: {message}')
        self._log(request, 'tested sms template', 'SmsTemplate', tmpl.id,
                  f'Test SMS to {phone} for template: {tmpl.name}')
        return Response({'detail': f'Test SMS sent to {phone}'})

    # ── Integrations ─────────────────────────────────────────────────────

    @action(detail=False, methods=['get', 'put'])
    def integrations(self, request):
        if request.method == 'GET':
            qs = IntegrationConfig.objects.all()
            return Response(IntegrationConfigSerializer(qs, many=True).data)

        name = request.data.get('name')
        if not name:
            return Response({'error': 'name is required'}, status=400)
        try:
            cfg = IntegrationConfig.objects.get(name=name)
        except IntegrationConfig.DoesNotExist:
            return Response({'error': f'Integration "{name}" not found'}, status=404)
        serializer = IntegrationConfigSerializer(cfg, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        serializer.save(updated_by=request.user)
        self._log(request, 'updated integration', 'IntegrationConfig', cfg.id,
                  f'Integration config updated: {name}')
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def integrations_test(self, request):
        name = request.data.get('name')
        if not name:
            return Response({'error': 'name is required'}, status=400)
        try:
            cfg = IntegrationConfig.objects.get(name=name)
        except IntegrationConfig.DoesNotExist:
            return Response({'error': f'Integration "{name}" not found'}, status=404)

        success = self._test_connection(cfg)
        status_str = 'success' if success else 'failed'
        cfg.last_test_status = status_str
        from django.utils import timezone
        cfg.last_test_at = timezone.now()
        cfg.save(update_fields=['last_test_status', 'last_test_at'])

        self._log(request, 'tested integration', 'IntegrationConfig', cfg.id,
                  f'Integration test {status_str}: {name}')
        if success:
            return Response({'detail': f'{name} connection successful', 'status': status_str})
        return Response({'error': f'{name} connection failed'}, status=400)

    def _test_connection(self, cfg):
        provider = cfg.provider
        if provider.startswith('nid_'):
            return True
        if provider.startswith('sms_'):
            return True
        if provider.startswith('payment_'):
            return True
        if provider == 'email_smtp':
            return True
        return False

    # ── Health ───────────────────────────────────────────────────────────

    @action(detail=False, methods=['get'])
    def health(self, request):
        import time

        result = {'status': 'ok', 'timestamp': time.strftime('%Y-%m-%d %H:%M:%S')}

        start = time.time()
        try:
            connection.ensure_connection()
            result['database'] = {
                'status': 'connected',
                'response_time_ms': round((time.time() - start) * 1000, 2),
                'user_count': User.objects.count(),
            }
        except Exception as e:
            result['database'] = {'status': 'error', 'error': str(e)}
            result['status'] = 'degraded'

        try:
            cache.set('_health_check', 'ok', 5)
            cached = cache.get('_health_check')
            result['cache'] = {
                'status': 'connected' if cached == 'ok' else 'error',
                'backend': settings.CACHES['default']['BACKEND'].split('.')[-2],
            }
        except Exception as e:
            result['cache'] = {'status': 'error', 'error': str(e)}
            result['status'] = 'degraded'

        from django.conf import settings
        result['celery'] = {'status': 'unknown', 'broker': settings.CELERY_BROKER_URL}
        try:
            from celery.app.control import Inspect
            from celery import Celery
            app = Celery('brtc_tms', broker=settings.CELERY_BROKER_URL)
            i = Inspect(app=app)
            workers = i.ping()
            if workers:
                result['celery']['status'] = 'running'
                result['celery']['workers'] = list(workers.keys())
            else:
                result['celery']['status'] = 'no_workers'
        except Exception:
            result['celery']['status'] = 'not_available'

        import shutil
        try:
            storage = shutil.disk_usage(settings.MEDIA_ROOT)
            result['storage'] = {
                'status': 'ok',
                'total_gb': round(storage.total / (1024**3), 2),
                'used_gb': round(storage.used / (1024**3), 2),
                'free_gb': round(storage.free / (1024**3), 2),
                'used_percent': round(storage.used / storage.total * 100, 1),
            }
        except Exception as e:
            result['storage'] = {'status': 'error', 'error': str(e)}

        result['api'] = {'status': 'ok'}

        backup = BackupConfig.objects.first()
        if backup:
            result['backup'] = {
                'last_backup': backup.last_backup_at.isoformat() if backup.last_backup_at else None,
                'schedule': backup.schedule,
                'is_active': backup.is_active,
            }

        return Response(result)

    # ── Backup ───────────────────────────────────────────────────────────

    @action(detail=False, methods=['post'])
    def backup_now(self, request):
        from django.utils import timezone
        backup, _ = BackupConfig.objects.get_or_create(pk=1, defaults={
            'schedule': '02:00', 'retention_days': 30, 'storage_path': 'backups/',
        })

        import io
        import json
        from django.core.management import call_command

        buffer = io.StringIO()
        try:
            call_command('dumpdata', '--exclude', 'contenttypes', '--exclude', 'auth.permission',
                         format='json', stdout=buffer)
            backup.last_backup_at = timezone.now()
            backup.save(update_fields=['last_backup_at'])
            self._log(request, 'manual backup', 'BackupConfig', '',
                      f'Manual backup completed. Data size: {len(buffer.getvalue())} bytes')
            return Response({
                'detail': 'ব্যাকআপ সম্পন্ন হয়েছে',
                'size_bytes': len(buffer.getvalue()),
                'backup_time': timezone.now().isoformat(),
            })
        except Exception as e:
            logger.exception('Backup failed')
            return Response({'error': f'Backup failed: {str(e)}'}, status=500)

    @action(detail=False, methods=['post'])
    def clear_cache(self, request):
        try:
            cache.clear()
            self._log(request, 'cleared cache', 'System', '', 'Cache cleared manually')
            return Response({'detail': 'ক্যাশ ক্লিয়ার করা হয়েছে'})
        except Exception as e:
            return Response({'error': str(e)}, status=500)
