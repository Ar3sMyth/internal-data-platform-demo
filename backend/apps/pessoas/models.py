from django.db import models
from apps.convenios.models import Convenio, Regiao


class Pessoa(models.Model):
    nome = models.CharField(max_length=300, blank=True, null=True)
    cpf = models.CharField(max_length=11, unique=True, db_index=True)
    cpf_valido = models.BooleanField(default=False)
    data_nascimento = models.DateField(null=True, blank=True)
    idade_calculada = models.SmallIntegerField(null=True, blank=True)
    cidade = models.CharField(max_length=150, blank=True, null=True, db_index=True)
    uf = models.CharField(max_length=2, blank=True, null=True, db_index=True)
    bloqueado = models.BooleanField(default=False, db_index=True)
    motivo_bloqueio = models.CharField(max_length=300, blank=True, null=True)
    observacoes = models.TextField(blank=True, null=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Pessoa"
        verbose_name_plural = "Pessoas"
        db_table = "pessoas"
        indexes = [
            models.Index(fields=["cidade", "uf"]),
            models.Index(fields=["idade_calculada"]),
            models.Index(fields=["cpf_valido"]),
        ]

    def __str__(self):
        return f"{self.nome or 'Sem nome'} — {self.cpf_formatado}"

    @property
    def cpf_formatado(self):
        c = self.cpf
        if len(c) == 11:
            return f"{c[:3]}.{c[3:6]}.{c[6:9]}-{c[9:]}"
        return c

    @property
    def cpf_mascarado(self):
        c = self.cpf
        if len(c) == 11:
            return f"{c[:3]}.***.*{c[8:9]}*-{c[9:]}"
        return "***.***.***-**"

    def ja_exportado(self):
        return self.itens_exportados.exists()

    def total_exportacoes(self):
        return self.itens_exportados.count()


class PessoaBase(models.Model):
    """Relaciona uma pessoa a uma base importada (uma pessoa pode estar em várias bases)."""
    pessoa = models.ForeignKey(
        Pessoa, on_delete=models.CASCADE, related_name="bases"
    )
    base_importada = models.ForeignKey(
        "importacao.BaseImportada", on_delete=models.CASCADE, related_name="pessoas_base"
    )
    convenio = models.ForeignKey(
        Convenio, on_delete=models.SET_NULL, null=True, blank=True
    )
    regiao = models.ForeignKey(
        Regiao, on_delete=models.SET_NULL, null=True, blank=True
    )
    linha_original = models.IntegerField(null=True, blank=True)
    dados_originais = models.JSONField(null=True, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Pessoa × Base"
        verbose_name_plural = "Pessoas × Bases"
        db_table = "pessoa_base"
        unique_together = ("pessoa", "base_importada")

    def __str__(self):
        return f"{self.pessoa.cpf} em {self.base_importada.nome_arquivo}"

