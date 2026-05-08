from django.apps import AppConfig


class TraineesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.trainees'
    verbose_name = 'প্রশিক্ষণার্থী'

    def ready(self):
        import apps.trainees.signals
