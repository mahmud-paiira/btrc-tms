from django.apps import AppConfig


class CircularsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.circulars'
    verbose_name = 'সার্কুলার'

    def ready(self):
        import apps.circulars.signals
