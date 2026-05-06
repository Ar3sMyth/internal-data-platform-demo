from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('pessoas', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='pessoa',
            name='bloqueado',
            field=models.BooleanField(db_index=True, default=False),
        ),
        migrations.AddField(
            model_name='pessoa',
            name='motivo_bloqueio',
            field=models.CharField(blank=True, max_length=300, null=True),
        ),
        migrations.AddField(
            model_name='pessoa',
            name='observacoes',
            field=models.TextField(blank=True, null=True),
        ),
    ]

