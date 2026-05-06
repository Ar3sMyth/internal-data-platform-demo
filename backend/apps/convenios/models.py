from django.db import models


class Convenio(models.Model):
    nome_convenio = models.CharField(max_length=150, unique=True)
    descricao = models.TextField(blank=True)
    ativo = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Convênio"
        verbose_name_plural = "Convênios"
        db_table = "convenios"
        ordering = ["nome_convenio"]

    def __str__(self):
        return self.nome_convenio


class Regiao(models.Model):
    nome_regiao = models.CharField(max_length=150)
    convenio = models.ForeignKey(
        Convenio, on_delete=models.RESTRICT, related_name="regioes"
    )
    ativo = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Região"
        verbose_name_plural = "Regiões"
        db_table = "regioes"
        unique_together = ("nome_regiao", "convenio")
        ordering = ["convenio", "nome_regiao"]

    def __str__(self):
        return f"{self.convenio.nome_convenio} › {self.nome_regiao}"

