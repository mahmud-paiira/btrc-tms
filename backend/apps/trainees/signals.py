import logging
from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from django.db import transaction

from apps.applications.models import Application
from .enrollment import create_trainee_from_application, EnrollmentAuditLog

logger = logging.getLogger(__name__)


@receiver(pre_save, sender=Application)
def auto_enroll_trainee(sender, instance, **kwargs):
    if not instance.pk:
        return

    try:
        old = sender.objects.get(pk=instance.pk)
    except sender.DoesNotExist:
        return

    was_pending = old.status != Application.ApplicationStatus.SELECTED
    now_selected = instance.status == Application.ApplicationStatus.SELECTED

    if was_pending and now_selected:
        transaction.on_commit(lambda: _ensure_trainee(instance.pk))


@receiver(post_save, sender=Application)
def auto_enroll_new_selected(sender, instance, created, **kwargs):
    if created and instance.status == Application.ApplicationStatus.SELECTED:
        transaction.on_commit(lambda: _ensure_trainee(instance.pk))


def _ensure_trainee(application_pk):
    from apps.applications.models import Application
    from .models import Trainee

    try:
        app = Application.objects.select_related(
            'circular', 'chosen_center', 'user'
        ).get(pk=application_pk)

        if app.user:
            trainee, created = Trainee.objects.get_or_create(
                user=app.user,
                defaults={
                    'application': app,
                    'center': app.chosen_center,
                },
            )
            if not created:
                changed = False
                if trainee.center_id != app.chosen_center_id:
                    trainee.center = app.chosen_center
                    changed = True
                if trainee.application_id != app.id:
                    trainee.application = app
                    changed = True
                if changed:
                    trainee.save(update_fields=['center', 'application'])
        else:
            trainee, is_new_user = create_trainee_from_application(app)

        log = EnrollmentAuditLog(
            application_no=app.application_no,
            trainee_registration_no=trainee.registration_no,
            user_email=trainee.user.email,
            result=EnrollmentAuditLog.Result.SUCCESS,
        )
        log.save()

        logger.info(
            f'Enrolled trainee: reg={trainee.registration_no}, '
            f'email={trainee.user.email}'
        )

    except Exception as e:
        try:
            app = Application.objects.get(pk=application_pk)
            log = EnrollmentAuditLog(
                application_no=app.application_no,
                result=EnrollmentAuditLog.Result.FAILED,
                error_message=str(e)[:500],
            )
            log.save()
        except Exception:
            log = EnrollmentAuditLog(
                application_no=str(application_pk),
                result=EnrollmentAuditLog.Result.FAILED,
                error_message=str(e)[:500],
            )
            log.save()

        logger.error(f'Enrollment failed for application {application_pk}: {e}', exc_info=True)
