from django.db.models import Q, Count
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination

from .models import Pessoa, PessoaBase
from apps.exportacao.models import ItemListaExportada
from apps.logs.utils import registrar_log
from utils.cpf_utils import formatar_cpf, mascarar_cpf, padronizar_cpf, validar_cpf


def serializar_pessoa(p: Pessoa, cpf_completo: bool = True) -> dict:
    cpf = formatar_cpf(p.cpf) if cpf_completo else mascarar_cpf(p.cpf)
    bases = p.bases.select_related("base_importada", "convenio", "regiao").first()
    convenio = None
    regiao = None
    base_nome = None
    if bases:
        convenio = bases.convenio.nome_convenio if bases.convenio else None
        regiao = bases.regiao.nome_regiao if bases.regiao else None
        base_nome = bases.base_importada.nome_arquivo if bases.base_importada else None

    return {
        "id": p.id,
        "nome": p.nome or "",
        "cpf": cpf,
        "cpf_raw": p.cpf if cpf_completo else None,
        "cpf_valido": p.cpf_valido,
        "data_nascimento": p.data_nascimento.strftime("%d/%m/%Y") if p.data_nascimento else None,
        "idade": p.idade_calculada,
        "cidade": p.cidade or "",
        "uf": p.uf or "",
        "convenio": convenio or "",
        "regiao": regiao or "",
        "base_origem": base_nome or "",
        "ja_exportado": p.ja_exportado(),
        "total_exportacoes": p.total_exportacoes(),
        "bloqueado": p.bloqueado,
        "motivo_bloqueio": p.motivo_bloqueio or "",
        "observacoes": p.observacoes or "",
        "total_bases": p.bases.count(),
    }


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def pessoas_busca(request):
    qs = Pessoa.objects.all()

    nome = request.GET.get("nome", "").strip()
    cpf = request.GET.get("cpf", "").strip()
    convenio_id = request.GET.get("convenio_id")
    regiao_id = request.GET.get("regiao_id")
    cidade = request.GET.get("cidade", "").strip()
    uf = request.GET.get("uf", "").strip()
    idade_min = request.GET.get("idade_min")
    idade_max = request.GET.get("idade_max")
    cpf_valido = request.GET.get("cpf_valido")
    apenas_nao_exportados = request.GET.get("apenas_nao_exportados")
    apenas_exportados = request.GET.get("apenas_exportados")
    base_id = request.GET.get("base_id")
    ordem = request.GET.get("ordem", "nome")
    incluir_bloqueados = request.GET.get("incluir_bloqueados")
    apenas_bloqueados = request.GET.get("apenas_bloqueados")

    if nome:
        qs = qs.filter(nome__icontains=nome)
    if cpf:
        cpf_clean = padronizar_cpf(cpf)
        qs = qs.filter(cpf__icontains=cpf_clean)
    if cidade:
        qs = qs.filter(cidade__icontains=cidade)
    if uf:
        qs = qs.filter(uf__iexact=uf)
    if idade_min:
        qs = qs.filter(idade_calculada__gte=int(idade_min))
    if idade_max:
        qs = qs.filter(idade_calculada__lte=int(idade_max))
    if cpf_valido == "true":
        qs = qs.filter(cpf_valido=True)
    elif cpf_valido == "false":
        qs = qs.filter(cpf_valido=False)

    # Filtro de bloqueados
    if apenas_bloqueados == "true":
        qs = qs.filter(bloqueado=True)
    elif incluir_bloqueados != "true":
        qs = qs.filter(bloqueado=False)

    # Filtros via PessoaBase
    if convenio_id or regiao_id or base_id:
        pb_qs = PessoaBase.objects.all()
        if convenio_id:
            pb_qs = pb_qs.filter(convenio_id=convenio_id)
        if regiao_id:
            pb_qs = pb_qs.filter(regiao_id=regiao_id)
        if base_id:
            pb_qs = pb_qs.filter(base_importada_id=base_id)
        ids = pb_qs.values_list("pessoa_id", flat=True)
        qs = qs.filter(id__in=ids)

    # Exportação
    if apenas_nao_exportados == "true":
        exportados_ids = ItemListaExportada.objects.values_list("pessoa_id", flat=True).distinct()
        qs = qs.exclude(id__in=exportados_ids)
    elif apenas_exportados == "true":
        exportados_ids = ItemListaExportada.objects.values_list("pessoa_id", flat=True).distinct()
        qs = qs.filter(id__in=exportados_ids)

    # Ordenação
    campos_validos = {
        "nome": "nome", "-nome": "-nome",
        "idade": "idade_calculada", "-idade": "-idade_calculada",
        "cidade": "cidade", "cpf": "cpf",
    }
    qs = qs.order_by(campos_validos.get(ordem, "nome"))

    paginator = PageNumberPagination()
    paginator.page_size = int(request.GET.get("page_size", 100))
    paginator.max_page_size = 5000
    resultado = paginator.paginate_queryset(qs, request)

    cpf_completo = request.user.pode_ver_cpf_completo
    dados = [serializar_pessoa(p, cpf_completo) for p in resultado]

    return Response({
        "resultados": dados,
        "total": paginator.page.paginator.count,
        "next": paginator.get_next_link(),
        "previous": paginator.get_previous_link(),
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def busca_lote(request):
    """Verifica uma lista de CPFs e retorna o status de cada um no banco."""
    cpfs_raw = request.data.get("cpfs", [])
    if not cpfs_raw:
        return Response({"detail": "Lista de CPFs vazia."}, status=400)

    resultado = []
    for cpf_input in cpfs_raw[:500]:
        cpf = padronizar_cpf(str(cpf_input).strip())
        try:
            pessoa = Pessoa.objects.get(cpf=cpf)
            pb = PessoaBase.objects.filter(pessoa=pessoa).select_related(
                "convenio", "regiao", "base_importada"
            ).first()
            resultado.append({
                "cpf_input": str(cpf_input).strip(),
                "cpf": formatar_cpf(cpf),
                "encontrado": True,
                "nome": pessoa.nome or "",
                "cpf_valido": pessoa.cpf_valido,
                "cidade": pessoa.cidade or "",
                "uf": pessoa.uf or "",
                "bloqueado": pessoa.bloqueado,
                "ja_exportado": pessoa.ja_exportado(),
                "convenio": pb.convenio.nome_convenio if pb and pb.convenio else "",
                "base_origem": pb.base_importada.nome_arquivo if pb and pb.base_importada else "",
            })
        except Pessoa.DoesNotExist:
            resultado.append({
                "cpf_input": str(cpf_input).strip(),
                "cpf": formatar_cpf(cpf) if len(cpf) == 11 else str(cpf_input).strip(),
                "encontrado": False,
                "cpf_valido": validar_cpf(cpf),
                "bloqueado": False,
                "ja_exportado": False,
            })

    encontrados = sum(1 for r in resultado if r["encontrado"])
    return Response({
        "resultados": resultado,
        "total": len(resultado),
        "encontrados": encontrados,
        "nao_encontrados": len(resultado) - encontrados,
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def excluir_pessoas(request):
    """Exclui uma ou mais pessoas pelo ID. Apenas administradores."""
    if request.user.perfil != "administrador":
        return Response({"detail": "Apenas administradores podem excluir registros."}, status=403)

    ids = request.data.get("ids", [])
    if not ids:
        return Response({"detail": "Nenhum ID informado."}, status=400)

    qs = Pessoa.objects.filter(id__in=ids)
    total = qs.count()
    if total == 0:
        return Response({"detail": "Nenhum registro encontrado."}, status=404)

    cpfs = list(qs.values_list("cpf", flat=True))
    registrar_log(
        request.user, "warning",
        f"Exclusao de {total} CPF(s)",
        detalhes={"ids": ids, "cpfs": cpfs[:20]},
        request=request,
    )
    qs.delete()
    return Response({"excluidos": total})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def editar_massa(request):
    """Edita campos de múltiplos registros ao mesmo tempo."""
    if not request.user.pode_importar:
        return Response({"detail": "Sem permissao para editar."}, status=403)

    ids = request.data.get("ids", [])
    campos = request.data.get("campos", {})

    if not ids or not campos:
        return Response({"detail": "IDs e campos sao obrigatorios."}, status=400)

    campos_permitidos = {"cidade", "uf"}
    campos_validos = {k: v for k, v in campos.items() if k in campos_permitidos}

    if not campos_validos:
        return Response({"detail": "Nenhum campo valido para edicao em massa."}, status=400)

    total = Pessoa.objects.filter(id__in=ids).update(**campos_validos)
    registrar_log(
        request.user, "info",
        f"Edicao em massa: {total} registro(s)",
        detalhes={"ids": ids[:20], "campos": campos_validos},
        request=request,
    )
    return Response({"atualizados": total})


@api_view(["GET", "PUT", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def pessoa_detail(request, pk):
    try:
        pessoa = Pessoa.objects.get(pk=pk)
    except Pessoa.DoesNotExist:
        return Response({"detail": "Pessoa nao encontrada."}, status=404)

    if request.method == "GET":
        cpf_completo = request.user.pode_ver_cpf_completo
        return Response(serializar_pessoa(pessoa, cpf_completo))

    if request.method == "DELETE":
        if request.user.perfil != "administrador":
            return Response({"detail": "Apenas administradores podem excluir registros."}, status=403)
        registrar_log(
            request.user, "warning",
            f"CPF excluido: {pessoa.cpf}",
            detalhes={"id": pessoa.id, "cpf": pessoa.cpf, "nome": pessoa.nome},
            request=request,
        )
        pessoa.delete()
        return Response(status=204)

    if not request.user.pode_importar:
        return Response({"detail": "Sem permissao para editar."}, status=403)

    campos_editaveis = ["nome", "cidade", "uf", "data_nascimento", "idade_calculada", "observacoes"]
    for campo in campos_editaveis:
        if campo in request.data:
            valor = request.data[campo]
            if campo == "data_nascimento" and valor:
                from utils.file_parser import parse_data_nascimento
                valor = parse_data_nascimento(valor)
            setattr(pessoa, campo, valor)

    if "data_nascimento" in request.data and pessoa.data_nascimento:
        from utils.file_parser import calcular_idade
        pessoa.idade_calculada = calcular_idade(pessoa.data_nascimento)

    pessoa.save()
    return Response(serializar_pessoa(pessoa, True))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def bloquear_cpf(request, pk):
    """Bloqueia ou desbloqueia um CPF. Apenas administradores."""
    if request.user.perfil != "administrador":
        return Response({"detail": "Apenas administradores podem bloquear CPFs."}, status=403)

    try:
        pessoa = Pessoa.objects.get(pk=pk)
    except Pessoa.DoesNotExist:
        return Response({"detail": "Pessoa nao encontrada."}, status=404)

    bloqueado = request.data.get("bloqueado", True)
    motivo = request.data.get("motivo", "").strip()

    pessoa.bloqueado = bloqueado
    pessoa.motivo_bloqueio = motivo if bloqueado else None
    pessoa.save(update_fields=["bloqueado", "motivo_bloqueio"])

    acao = "bloqueado" if bloqueado else "desbloqueado"
    registrar_log(
        request.user, "warning" if bloqueado else "info",
        f"CPF {acao}: {pessoa.cpf}",
        detalhes={"cpf": pessoa.cpf, "motivo": motivo},
        request=request,
    )
    return Response({"bloqueado": pessoa.bloqueado, "motivo_bloqueio": pessoa.motivo_bloqueio})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def historico_cpf(request, pk):
    """Retorna histórico de exportações de um CPF específico."""
    try:
        pessoa = Pessoa.objects.get(pk=pk)
    except Pessoa.DoesNotExist:
        return Response({"detail": "Pessoa nao encontrada."}, status=404)

    itens = (
        ItemListaExportada.objects
        .filter(pessoa=pessoa)
        .select_related("lista_exportada", "lista_exportada__usuario")
        .order_by("-lista_exportada__exportado_em")[:50]
    )
    return Response([{
        "lista_id": i.lista_exportada.id,
        "nome_lista": i.lista_exportada.nome_lista,
        "formato": i.lista_exportada.formato,
        "usuario": i.lista_exportada.usuario.nome if i.lista_exportada.usuario else "—",
        "exportado_em": i.lista_exportada.exportado_em.strftime("%d/%m/%Y %H:%M"),
    } for i in itens])


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    from apps.importacao.models import BaseImportada
    from apps.exportacao.models import ListaExportada
    from apps.convenios.models import Convenio

    total_cpfs = Pessoa.objects.count()
    total_validos = Pessoa.objects.filter(cpf_valido=True).count()
    total_invalidos = Pessoa.objects.filter(cpf_valido=False).count()
    total_bloqueados = Pessoa.objects.filter(bloqueado=True).count()
    total_bases = BaseImportada.objects.filter(status_importacao="concluido").count()
    total_convenios = Convenio.objects.filter(ativo=True).count()

    exportados_ids = ItemListaExportada.objects.values_list("pessoa_id", flat=True).distinct()
    total_exportados = len(set(exportados_ids))
    total_nao_exportados = max(0, total_validos - total_exportados)

    # Distribuição de faixas etárias
    faixas = [("18-30", 18, 30), ("31-45", 31, 45), ("46-60", 46, 60), ("61-70", 61, 70), ("71+", 71, 130)]
    distribuicao_idades = [
        {"faixa": label, "total": Pessoa.objects.filter(
            cpf_valido=True, idade_calculada__gte=min_i, idade_calculada__lte=max_i
        ).count()}
        for label, min_i, max_i in faixas
    ]

    # Por convênio
    por_convenio = (
        PessoaBase.objects.values("convenio__nome_convenio")
        .annotate(total=Count("pessoa", distinct=True))
        .filter(convenio__isnull=False)
        .order_by("-total")[:10]
    )

    # Por região
    por_regiao = (
        PessoaBase.objects.values("regiao__nome_regiao", "convenio__nome_convenio")
        .annotate(total=Count("pessoa", distinct=True))
        .filter(regiao__isnull=False)
        .order_by("-total")[:10]
    )

    ultimas_importacoes = BaseImportada.objects.select_related(
        "convenio", "regiao", "importado_por"
    ).order_by("-data_importacao")[:5]

    ultimas_exportacoes = ListaExportada.objects.select_related("usuario").order_by("-exportado_em")[:5]

    return Response({
        "total_cpfs": total_cpfs,
        "total_validos": total_validos,
        "total_invalidos": total_invalidos,
        "total_bloqueados": total_bloqueados,
        "total_bases": total_bases,
        "total_convenios": total_convenios,
        "total_exportados": total_exportados,
        "total_nao_exportados": total_nao_exportados,
        "distribuicao_idades": distribuicao_idades,
        "por_convenio": [
            {"convenio": r["convenio__nome_convenio"], "total": r["total"]}
            for r in por_convenio
        ],
        "por_regiao": [
            {"regiao": r["regiao__nome_regiao"], "convenio": r["convenio__nome_convenio"], "total": r["total"]}
            for r in por_regiao
        ],
        "ultimas_importacoes": [
            {
                "id": b.id,
                "nome_arquivo": b.nome_arquivo,
                "convenio": b.convenio.nome_convenio if b.convenio else "",
                "regiao": b.regiao.nome_regiao if b.regiao else "",
                "quantidade_validos": b.quantidade_validos,
                "quantidade_invalidos": b.quantidade_invalidos,
                "quantidade_duplicados": b.quantidade_duplicados,
                "data_importacao": b.data_importacao.strftime("%d/%m/%Y %H:%M"),
                "status": b.status_importacao,
            }
            for b in ultimas_importacoes
        ],
        "ultimas_exportacoes": [
            {
                "id": e.id,
                "nome_lista": e.nome_lista,
                "quantidade_cpfs": e.quantidade_cpfs,
                "formato": e.formato,
                "exportado_em": e.exportado_em.strftime("%d/%m/%Y %H:%M"),
            }
            for e in ultimas_exportacoes
        ],
    })

