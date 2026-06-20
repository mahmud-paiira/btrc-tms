"""Verify seeded trainee data across all menu endpoints."""
import os, sys
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'brtc_tms.settings')
import django; django.setup()
from rest_framework.test import APIRequestFactory, force_authenticate

factory = APIRequestFactory()
User = django.contrib.auth.get_user_model()

phone = sys.argv[1] if len(sys.argv) > 1 else '01724714648'
user = User.objects.get(phone=phone)

from apps.trainees.views_trainee import TraineePortalViewSet
from apps.trainees.models import Trainee
trainee = Trainee.objects.get(user=user)

results = {}
for action in ('me', 'schedule', 'attendance', 'assessments', 'certificate', 'profile', 'my_applications'):
    view = TraineePortalViewSet.as_view({'get': action})
    req = factory.get(f'/api/trainee/me/{action}/')
    force_authenticate(req, user)
    resp = view(req)
    results[action] = {'status': resp.status_code, 'data': resp.data}

print(f'Phone: {phone}')
print(f'Trainee: {trainee.registration_no}')
print(f'Batch: {trainee.batch.batch_no if trainee.batch else "N/A"}')
print(f'{"="*50}')
all_ok = True
for action, r in results.items():
    status = r['status']
    data = r['data']
    ok = status in (200, 201)
    if ok:
        if action == 'me':
            detail = f'name={data.get("name_bn","?")} batch={data.get("batch","?")}'
        elif action == 'schedule':
            detail = f'{len(data)} plans'
        elif action == 'attendance':
            detail = f'total={data.get("total_sessions","?")} present={data.get("present","?")}'
        elif action == 'assessments':
            detail = f'{len(data.get("assessments",[]))} records'
        elif action == 'certificate':
            detail = f'has={data.get("has_certificate",False)} no={data.get("certificate_no","?")}'
        elif action == 'profile':
            detail = 'loaded'
        elif action == 'my_applications':
            detail = f'{len(data) if isinstance(data, list) else data.get("count","?")} apps'
        else:
            detail = 'OK'
        print(f'  [{action:16s}] \u2713 {detail}')
    else:
        all_ok = False
        print(f'  [{action:16s}] \u2717 status={status}: {data.get("detail","?")}')

print(f'{"="*50}')
check = '\u2713' if all_ok else '\u2717'
print(f'All menus: {check}')
