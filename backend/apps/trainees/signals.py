import logging
from django.db.models.signals import pre_save
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

    if was_pending and now_selected and not instance.user:
        transaction.on_commit(lambda: _execute_enrollment(instance.pk))


def _execute_enrollment(application_pk):
    from apps.applications.models import Application

    try:
        app = Application.objects.select_related('circular__center').get(pk=application_pk)

        if app.user:
            log = EnrollmentAuditLog(
                application_no=app.application_no,
                result=EnrollmentAuditLog.Result.USER_EXISTS,
                error_message='User already linked to this application',
            )
            log.save()
            logger.warning(f'Enrollment skipped: application {app.application_no} already has user')
            return

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
            f'email={trainee.user.email}, '
            f'new_user={is_new_user}'
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
