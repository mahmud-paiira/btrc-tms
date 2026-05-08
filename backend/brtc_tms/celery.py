import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'brtc_tms.settings')
app = Celery('brtc_tms')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()
