from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import LogSistema


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def logs_list(request):
    if request.user.perfil != "administrador":
        return Response({"detail": "Sem permissão."}, status=403)

    qs = LogSistema.objects.select_related("usuario").order_by("-criado_em")

    tipo = request.GET.get("tipo")
    if tipo:
        qs = qs.filter(tipo=tipo)

    qs = qs[:200]

    dados = [
        {
            "id": l.id,
            "usuario": l.usuario.nome if l.usuario else "Sistema",
            "tipo": l.tipo,
            "acao": l.acao,
            "detalhes": l.detalhes,
            "ip_origem": str(l.ip_origem) if l.ip_origem else None,
            "criado_em": l.criado_em.strftime("%d/%m/%Y %H:%M:%S"),
        }
        for l in qs
    ]
    return Response(dados)

