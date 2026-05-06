from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Convenio, Regiao


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def convenios_list(request):
    if request.method == "GET":
        convenios = Convenio.objects.filter(ativo=True).prefetch_related("regioes")
        dados = [
            {
                "id": c.id,
                "nome_convenio": c.nome_convenio,
                "descricao": c.descricao,
                "regioes": [
                    {"id": r.id, "nome_regiao": r.nome_regiao}
                    for r in c.regioes.filter(ativo=True)
                ],
            }
            for c in convenios
        ]
        return Response(dados)

    if not request.user.pode_gerenciar_usuarios:
        return Response({"detail": "Sem permissao."}, status=403)

    nome = request.data.get("nome_convenio", "").strip()
    if not nome:
        return Response({"detail": "Nome do convenio e obrigatorio."}, status=400)

    conv, criado = Convenio.objects.get_or_create(
        nome_convenio=nome,
        defaults={"descricao": request.data.get("descricao", ""), "ativo": True}
    )
    if not criado and not conv.ativo:
        conv.ativo = True
        conv.save()
    return Response({"id": conv.id, "nome_convenio": conv.nome_convenio, "criado": criado}, status=201 if criado else 200)


@api_view(["PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def convenio_detail(request, pk):
    if not request.user.pode_gerenciar_usuarios:
        return Response({"detail": "Sem permissao."}, status=403)

    try:
        conv = Convenio.objects.get(pk=pk)
    except Convenio.DoesNotExist:
        return Response({"detail": "Convenio nao encontrado."}, status=404)

    if request.method == "DELETE":
        conv.ativo = False
        conv.save(update_fields=["ativo"])
        return Response({"detail": "Convenio desativado."})

    if "nome_convenio" in request.data:
        conv.nome_convenio = request.data["nome_convenio"].strip()
    if "descricao" in request.data:
        conv.descricao = request.data["descricao"]
    conv.save()
    return Response({
        "id": conv.id,
        "nome_convenio": conv.nome_convenio,
        "descricao": conv.descricao,
        "regioes": [{"id": r.id, "nome_regiao": r.nome_regiao} for r in conv.regioes.filter(ativo=True)],
    })


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def regioes_list(request, convenio_id):
    try:
        convenio = Convenio.objects.get(pk=convenio_id)
    except Convenio.DoesNotExist:
        return Response({"detail": "Convenio nao encontrado."}, status=404)

    if request.method == "GET":
        regioes = convenio.regioes.filter(ativo=True)
        return Response([{"id": r.id, "nome_regiao": r.nome_regiao} for r in regioes])

    if not request.user.pode_importar:
        return Response({"detail": "Sem permissao."}, status=403)

    nome = request.data.get("nome_regiao", "").strip()
    if not nome:
        return Response({"detail": "Nome da regiao e obrigatorio."}, status=400)

    regiao, criado = Regiao.objects.get_or_create(
        nome_regiao=nome, convenio=convenio,
        defaults={"ativo": True}
    )
    if not criado and not regiao.ativo:
        regiao.ativo = True
        regiao.save()
    return Response({"id": regiao.id, "nome_regiao": regiao.nome_regiao, "criado": criado}, status=201 if criado else 200)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def regiao_detail(request, convenio_id, regiao_id):
    if not request.user.pode_importar:
        return Response({"detail": "Sem permissao."}, status=403)

    try:
        regiao = Regiao.objects.get(pk=regiao_id, convenio_id=convenio_id)
    except Regiao.DoesNotExist:
        return Response({"detail": "Regiao nao encontrada."}, status=404)

    regiao.ativo = False
    regiao.save(update_fields=["ativo"])
    return Response({"detail": "Regiao desativada."})

