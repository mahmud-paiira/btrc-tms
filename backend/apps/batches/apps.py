from django.apps import AppConfig


class BatchesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.batches'
    verbose_name = 'ব্যাচ'

    def ready(self):
        import apps.batches.signals
