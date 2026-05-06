from django.db import models
from apps.usuarios.models import Usuario


class LogSistema(models.Model):
    TIPO_CHOICES = [
        ("info", "Info"),
        ("warning", "Aviso"),
        ("error", "Erro"),
        ("importacao", "Importação"),
        ("exportacao", "Exportação"),
        ("acesso", "Acesso"),
        ("seguranca", "Segurança"),
    ]

    usuario = models.ForeignKey(
        Usuario, on_delete=models.SET_NULL, null=True, blank=True, related_name="logs"
    )
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, db_index=True)
    acao = models.CharField(max_length=300)
    detalhes = models.JSONField(null=True, blank=True)
    ip_origem = models.GenericIPAddressField(null=True, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = "Log do Sistema"
        verbose_name_plural = "Logs do Sistema"
        db_table = "logs_sistema"
        ordering = ["-criado_em"]

    def __str__(self):
        return f"[{self.tipo.upper()}] {self.acao} — {self.criado_em.strftime('%d/%m/%Y %H:%M')}"

