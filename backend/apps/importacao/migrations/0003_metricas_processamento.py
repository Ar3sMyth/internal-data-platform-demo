from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("importacao", "0002_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="baseimportada",
            name="duracao_segundos",
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="baseimportada",
            name="metricas_processamento",
            field=models.JSONField(blank=True, null=True),
        ),
    ]

