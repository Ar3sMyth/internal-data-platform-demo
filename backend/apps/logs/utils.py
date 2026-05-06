from .models import LogSistema


def registrar_log(usuario, tipo: str, acao: str, detalhes: dict = None, request=None):
    """Helper para registrar logs no banco."""
    ip = None
    if request:
        ip = request.META.get("REMOTE_ADDR")
    LogSistema.objects.create(
        usuario=usuario if usuario and usuario.is_authenticated else None,
        tipo=tipo,
        acao=acao,
        detalhes=detalhes,
        ip_origem=ip,
    )

