from django.db import models
from apps.convenios.models import Convenio, Regiao
from apps.usuarios.models import Usuario


class BaseImportada(models.Model):
    STATUS_CHOICES = [
        ("processando", "Processando"),
        ("concluido", "Concluído"),
        ("parcial", "Parcial"),
        ("erro", "Erro"),
    ]

    nome_arquivo = models.CharField(max_length=500)
    caminho_origem = models.CharField(max_length=1000, blank=True)
    convenio = models.ForeignKey(
        Convenio, on_delete=models.SET_NULL, null=True, blank=True, related_name="bases"
    )
    regiao = models.ForeignKey(
        Regiao, on_delete=models.SET_NULL, null=True, blank=True, related_name="bases"
    )
    quantidade_registros = models.IntegerField(default=0)
    quantidade_validos = models.IntegerField(default=0)
    quantidade_invalidos = models.IntegerField(default=0)
    quantidade_duplicados = models.IntegerField(default=0)
    importado_por = models.ForeignKey(
        Usuario, on_delete=models.SET_NULL, null=True, related_name="bases_importadas"
    )
    data_importacao = models.DateTimeField(auto_now_add=True)
    status_importacao = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="processando"
    )
    observacoes = models.TextField(blank=True)
    mapeamento_colunas = models.JSONField(null=True, blank=True)
    erros_detalhados = models.JSONField(null=True, blank=True)
    duracao_segundos = models.FloatField(null=True, blank=True)
    metricas_processamento = models.JSONField(null=True, blank=True)

    class Meta:
        verbose_name = "Base Importada"
        verbose_name_plural = "Bases Importadas"
        db_table = "bases_importadas"
        ordering = ["-data_importacao"]

    def __str__(self):
        return f"{self.nome_arquivo} ({self.data_importacao.strftime('%d/%m/%Y')})"

    @property
    def quantidade_novos(self):
        return self.quantidade_validos - self.quantidade_duplicados

