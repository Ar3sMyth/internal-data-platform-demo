import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('exportacao', '0003_initial'),
        ('usuarios', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='TemplateExportacao',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nome', models.CharField(max_length=200)),
                ('filtros', models.JSONField(default=dict)),
                ('formato', models.CharField(default='txt', max_length=15)),
                ('com_pontuacao', models.BooleanField(default=False)),
                ('limite', models.IntegerField(default=500)),
                ('criado_em', models.DateTimeField(auto_now_add=True)),
                ('criado_por', models.ForeignKey(
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='templates_exportacao',
                    to='usuarios.usuario',
                )),
            ],
            options={
                'verbose_name': 'Template de Exportacao',
                'db_table': 'templates_exportacao',
                'ordering': ['nome'],
            },
        ),
    ]

