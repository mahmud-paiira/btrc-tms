from django.core.management.base import BaseCommand
from apps.centers.models import Center
from apps.accounts.models import User


class Command(BaseCommand):
    help = 'Create center_admin users for all centers that do not have one'

    def add_arguments(self, parser):
        parser.add_argument('--password', type=str, default='center@123', help='Default password for all admins')

    def handle(self, *args, **options):
        password = options['password']
        centers = Center.objects.all().order_by('code')
        created = 0
        skipped = 0
        orphans = 0

        for c in centers:
            email = f'center{c.code}@brtc.gov.bd'
            existing = User.objects.filter(email=email).first()
            if existing:
                changed = False
                if existing.center_id != c.id:
                    existing.center = c
                    changed = True
                if existing.user_type != 'center_admin':
                    existing.user_type = 'center_admin'
                    changed = True
                if changed:
                    existing.save(update_fields=['center', 'user_type'])
                    self.stdout.write(self.style.WARNING(
                        f'{email}: updated (center {c.code})'
                    ))
                else:
                    self.stdout.write(f'{email}: already correct (center {c.code})')
                skipped += 1
                continue

            try:
                admin = User.objects.create_user(
                    email=email,
                    password=password,
                    user_type='center_admin',
                    center=c,
                    full_name_bn=f'কেন্দ্র প্রশাসক - {c.name_bn}',
                    full_name_en=f'Center Admin - {c.name_en}',
                nid=f'{c.code.zfill(8)}NID00000',
                phone=f'019{c.code.zfill(8)}',
                    birth_certificate_no=f'{c.code.zfill(10)}000000',
                    is_active=True,
                )
                self.stdout.write(self.style.SUCCESS(f'Created: {email} → {c.code}'))
                created += 1
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Failed: {email} → {e}'))
                skipped += 1

        orphan_qs = User.objects.filter(user_type='center_admin', center__isnull=True)
        for u in orphan_qs:
            self.stdout.write(self.style.WARNING(f'Orphan: {u.email} (no center assigned)'))
        orphan_count = orphan_qs.count()

        self.stdout.write(self.style.SUCCESS(f'\nDone! Created: {created}, Skipped/Updated: {skipped}, Orphans: {orphan_count}'))
