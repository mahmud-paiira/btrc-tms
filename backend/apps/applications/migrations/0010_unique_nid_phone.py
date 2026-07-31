from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('applications', '0009_eyescreeningtest'),
    ]

    def dedupe_applications(apps, schema_editor):
        Application = apps.get_model('applications', 'Application')
        for field in ('nid', 'phone'):
            seen = set()
            for app in Application.objects.order_by('id'):
                key = getattr(app, field)
                if key in seen:
                    app.delete()
                else:
                    seen.add(key)

    operations = [
        migrations.RunPython(dedupe_applications, migrations.RunPython.noop),
    ]
