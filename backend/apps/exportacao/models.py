from django.db import models
from apps.usuarios.models import Usuario
from apps.pessoas.models import Pessoa


class ListaExportada(models.Model):
    FORMATO_CHOICES = [
        ("txt", "TXT"),
        ("csv", "CSV"),
        ("xlsx", "XLSX"),
        ("clipboard", "Área de Transferência"),
    ]

    nome_lista = models.CharField(max_length=500)
    filtros_utilizados = models.JSONField(default=dict)
    quantidade_cpfs = models.IntegerField(default=0)
    formato = models.CharField(max_length=15, choices=FORMATO_CHOICES)
    com_pontuacao = models.BooleanField(default=False)
    arquivo_gerado = models.CharField(max_length=500, blank=True)
    usuario = models.ForeignKey(
        Usuario, on_delete=models.SET_NULL, null=True, related_name="exportacoes"
    )
    exportado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Lista Exportada"
        verbose_name_plural = "Listas Exportadas"
        db_table = "listas_exportadas"
        ordering = ["-exportado_em"]

    def __str__(self):
        return f"{self.nome_lista} ({self.exportado_em.strftime('%d/%m/%Y %H:%M')})"


class ItemListaExportada(models.Model):
    lista_exportada = models.ForeignKey(
        ListaExportada, on_delete=models.CASCADE, related_name="itens"
    )
    pessoa = models.ForeignKey(
        Pessoa, on_delete=models.CASCADE, related_name="itens_exportados"
    )
    cpf_exportado = models.CharField(max_length=14)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Item Exportado"
        verbose_name_plural = "Itens Exportados"
        db_table = "itens_lista_exportada"
        indexes = [
            models.Index(fields=["pessoa"]),
            models.Index(fields=["lista_exportada"]),
        ]


class TemplateExportacao(models.Model):
    nome = models.CharField(max_length=200)
    filtros = models.JSONField(default=dict)
    formato = models.CharField(max_length=15, default="txt")
    com_pontuacao = models.BooleanField(default=False)
    limite = models.IntegerField(default=500)
    criado_por = models.ForeignKey(
        Usuario, on_delete=models.SET_NULL, null=True, related_name="templates_exportacao"
    )
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Template de Exportação"
        verbose_name_plural = "Templates de Exportação"
        db_table = "templates_exportacao"
        ordering = ["nome"]

    def __str__(self):
        return self.nome

