import os
from pathlib import Path
from django.conf import settings
from django.http import FileResponse, HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import ListaExportada, ItemListaExportada
from apps.pessoas.models import Pessoa
from apps.exportacao.models import ItemListaExportada as ILE
from apps.logs.utils import registrar_log
from utils.cpf_utils import formatar_cpf, padronizar_cpf
from utils.excel_exporter import exportar_xlsx_cpfs, exportar_csv, exportar_txt, exportar_xlsx


def _buscar_pessoas(filtros: dict):
    """Reutiliza a mesma lógica de busca da view de pessoas."""
    from apps.pessoas.models import PessoaBase
    qs = Pessoa.objects.filter(cpf_valido=True)

    if filtros.get("convenio_id"):
        ids = PessoaBase.objects.filter(convenio_id=filtros["convenio_id"]).values_list("pessoa_id", flat=True)
        qs = qs.filter(id__in=ids)
    if filtros.get("regiao_id"):
        ids = PessoaBase.objects.filter(regiao_id=filtros["regiao_id"]).values_list("pessoa_id", flat=True)
        qs = qs.filter(id__in=ids)
    if filtros.get("base_id"):
        ids = PessoaBase.objects.filter(base_importada_id=filtros["base_id"]).values_list("pessoa_id", flat=True)
        qs = qs.filter(id__in=ids)
    if filtros.get("cidade"):
        qs = qs.filter(cidade__icontains=filtros["cidade"])
    if filtros.get("uf"):
        qs = qs.filter(uf__iexact=filtros["uf"])
    if filtros.get("idade_min"):
        qs = qs.filter(idade_calculada__gte=int(filtros["idade_min"]))
    if filtros.get("idade_max"):
        qs = qs.filter(idade_calculada__lte=int(filtros["idade_max"]))
    if filtros.get("apenas_nao_exportados"):
        exportados_ids = ILE.objects.values_list("pessoa_id", flat=True).distinct()
        qs = qs.exclude(id__in=exportados_ids)

    limite = int(filtros.get("limite", 500))
    return qs[:limite]


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def exportar(request):
    if not request.user.pode_exportar:
        return Response({"detail": "Sem permissão para exportar."}, status=403)

    filtros = request.data.get("filtros", {})
    formato = request.data.get("formato", "txt")
    com_pontuacao = request.data.get("com_pontuacao", False)
    nome_lista = request.data.get("nome_lista", "Exportação")
    marcar_usados = request.data.get("marcar_usados", True)
    limite = int(request.data.get("limite", 500))

    filtros["limite"] = limite

    pessoas = list(_buscar_pessoas(filtros))

    if not pessoas:
        return Response({"detail": "Nenhum CPF encontrado com esses filtros."}, status=404)

    # Aviso: CPFs já exportados anteriormente
    ids_pessoas = [p.id for p in pessoas]
    ja_exportados = set(
        ILE.objects.filter(pessoa_id__in=ids_pessoas)
        .values_list("pessoa_id", flat=True)
        .distinct()
    )
    aviso_ja_exportados = len(ja_exportados)

    # Gera lista de CPFs
    if com_pontuacao:
        cpfs = [formatar_cpf(p.cpf) for p in pessoas]
    else:
        cpfs = [padronizar_cpf(p.cpf) for p in pessoas]

    # Salva registro no banco
    lista = ListaExportada.objects.create(
        nome_lista=nome_lista,
        filtros_utilizados=filtros,
        quantidade_cpfs=len(cpfs),
        formato=formato,
        com_pontuacao=com_pontuacao,
        usuario=request.user,
    )

    if marcar_usados:
        itens = [
            ItemListaExportada(
                lista_exportada=lista,
                pessoa=p,
                cpf_exportado=formatar_cpf(p.cpf) if com_pontuacao else padronizar_cpf(p.cpf),
            )
            for p in pessoas
        ]
        ItemListaExportada.objects.bulk_create(itens, ignore_conflicts=True)

    registrar_log(
        request.user,
        "exportacao",
        f"Exportação: {nome_lista}",
        detalhes={
            "lista_id": lista.id,
            "formato": formato,
            "quantidade": len(cpfs),
            "filtros": filtros,
            "marcados_usados": marcar_usados,
        },
        request=request,
    )

    # Gera arquivo conforme formato
    if formato == "clipboard":
        return Response({
            "cpfs": cpfs,
            "quantidade": len(cpfs),
            "lista_id": lista.id,
            "aviso_ja_exportados": aviso_ja_exportados,
        })

    nome_arquivo = nome_lista.replace(" ", "_").replace("/", "-")[:80]

    if formato == "txt":
        conteudo = exportar_txt(cpfs)
        response = HttpResponse(conteudo, content_type="text/plain; charset=utf-8")
        response["Content-Disposition"] = f'attachment; filename="{nome_arquivo}.txt"'

    elif formato == "csv":
        conteudo = exportar_csv(cpfs)
        response = HttpResponse(conteudo, content_type="text/csv; charset=utf-8-sig")
        response["Content-Disposition"] = f'attachment; filename="{nome_arquivo}.csv"'

    elif formato == "xlsx":
        conteudo = exportar_xlsx_cpfs(cpfs, com_pontuacao=com_pontuacao)
        response = HttpResponse(
            conteudo,
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        response["Content-Disposition"] = f'attachment; filename="{nome_arquivo}.xlsx"'
    else:
        return Response({"detail": "Formato inválido."}, status=400)

    response["X-Lista-ID"] = str(lista.id)
    response["X-Quantidade"] = str(len(cpfs))
    response["X-Aviso-Exportados"] = str(aviso_ja_exportados)
    return response


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def exportar_completo(request):
    """Exporta planilha completa com todos os dados (não só CPF)."""
    if not request.user.pode_exportar:
        return Response({"detail": "Sem permissão para exportar."}, status=403)

    filtros = request.data.get("filtros", {})
    nome_lista = request.data.get("nome_lista", "Exportação Completa")
    filtros["limite"] = int(request.data.get("limite", 500))

    pessoas = list(_buscar_pessoas(filtros))
    if not pessoas:
        return Response({"detail": "Nenhum registro encontrado."}, status=404)

    from apps.pessoas.models import PessoaBase
    dados = []
    for p in pessoas:
        pb = PessoaBase.objects.filter(pessoa=p).select_related("convenio", "regiao", "base_importada").first()
        dados.append({
            "cpf": formatar_cpf(p.cpf),
            "nome": p.nome or "",
            "data_nascimento": p.data_nascimento.strftime("%d/%m/%Y") if p.data_nascimento else "",
            "idade": p.idade_calculada or "",
            "cidade": p.cidade or "",
            "uf": p.uf or "",
            "convenio": pb.convenio.nome_convenio if pb and pb.convenio else "",
            "regiao": pb.regiao.nome_regiao if pb and pb.regiao else "",
            "base_origem": pb.base_importada.nome_arquivo if pb and pb.base_importada else "",
            "ja_exportado": "Sim" if p.ja_exportado() else "Não",
        })

    colunas = [
        ("cpf", "CPF"), ("nome", "Nome"), ("data_nascimento", "Nascimento"),
        ("idade", "Idade"), ("cidade", "Cidade"), ("uf", "UF"),
        ("convenio", "Convênio"), ("regiao", "Região"),
        ("base_origem", "Base de Origem"), ("ja_exportado", "Já Exportado"),
    ]
    conteudo = exportar_xlsx(dados, colunas=colunas)
    nome_arquivo = nome_lista.replace(" ", "_")[:80]
    response = HttpResponse(
        conteudo,
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    response["Content-Disposition"] = f'attachment; filename="{nome_arquivo}_completo.xlsx"'
    return response


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def historico_exportacoes(request):
    listas = ListaExportada.objects.select_related("usuario").order_by("-exportado_em")[:50]
    dados = [
        {
            "id": l.id,
            "nome_lista": l.nome_lista,
            "quantidade_cpfs": l.quantidade_cpfs,
            "formato": l.formato,
            "com_pontuacao": l.com_pontuacao,
            "usuario": l.usuario.nome if l.usuario else "",
            "exportado_em": l.exportado_em.strftime("%d/%m/%Y %H:%M"),
            "filtros": l.filtros_utilizados,
        }
        for l in listas
    ]
    return Response(dados)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def templates_list(request):
    from .models import TemplateExportacao
    if request.method == "GET":
        templates = TemplateExportacao.objects.all()
        return Response([{
            "id": t.id,
            "nome": t.nome,
            "filtros": t.filtros,
            "formato": t.formato,
            "com_pontuacao": t.com_pontuacao,
            "limite": t.limite,
            "criado_por": t.criado_por.nome if t.criado_por else "",
            "criado_em": t.criado_em.strftime("%d/%m/%Y"),
        } for t in templates])

    nome = request.data.get("nome", "").strip()
    if not nome:
        return Response({"detail": "Nome e obrigatorio."}, status=400)
    template = TemplateExportacao.objects.create(
        nome=nome,
        filtros=request.data.get("filtros", {}),
        formato=request.data.get("formato", "txt"),
        com_pontuacao=request.data.get("com_pontuacao", False),
        limite=int(request.data.get("limite", 500)),
        criado_por=request.user,
    )
    return Response({"id": template.id, "nome": template.nome}, status=201)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def template_detail(request, pk):
    from .models import TemplateExportacao
    try:
        template = TemplateExportacao.objects.get(pk=pk)
    except TemplateExportacao.DoesNotExist:
        return Response({"detail": "Template nao encontrado."}, status=404)
    template.delete()
    return Response(status=204)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def previsualizar_exportacao(request):
    """Retorna quantos CPFs seriam exportados com determinados filtros."""
    from apps.pessoas.models import PessoaBase

    filtros = {
        "convenio_id": request.GET.get("convenio_id"),
        "regiao_id": request.GET.get("regiao_id"),
        "base_id": request.GET.get("base_id"),
        "cidade": request.GET.get("cidade"),
        "uf": request.GET.get("uf"),
        "idade_min": request.GET.get("idade_min"),
        "idade_max": request.GET.get("idade_max"),
        "apenas_nao_exportados": request.GET.get("apenas_nao_exportados") == "true",
        "limite": 999999,
    }

    qs = Pessoa.objects.filter(cpf_valido=True)
    if filtros.get("convenio_id"):
        ids = PessoaBase.objects.filter(convenio_id=filtros["convenio_id"]).values_list("pessoa_id", flat=True)
        qs = qs.filter(id__in=ids)
    if filtros.get("regiao_id"):
        ids = PessoaBase.objects.filter(regiao_id=filtros["regiao_id"]).values_list("pessoa_id", flat=True)
        qs = qs.filter(id__in=ids)
    if filtros.get("cidade"):
        qs = qs.filter(cidade__icontains=filtros["cidade"])
    if filtros.get("uf"):
        qs = qs.filter(uf__iexact=filtros["uf"])
    if filtros.get("idade_min"):
        qs = qs.filter(idade_calculada__gte=int(filtros["idade_min"]))
    if filtros.get("idade_max"):
        qs = qs.filter(idade_calculada__lte=int(filtros["idade_max"]))
    if filtros.get("apenas_nao_exportados"):
        exportados_ids = ILE.objects.values_list("pessoa_id", flat=True).distinct()
        qs = qs.exclude(id__in=exportados_ids)

    total = qs.count()
    return Response({"total_disponivel": total})

