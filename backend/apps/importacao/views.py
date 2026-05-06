import time
import uuid
from pathlib import Path

from django.conf import settings
from django.db import transaction
from django.db.models import Count, Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import BaseImportada
from apps.convenios.models import Convenio, Regiao
from apps.logs.utils import registrar_log
from apps.pessoas.models import Pessoa, PessoaBase
from utils.file_parser import analisar_planilha, processar_planilha


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def analisar_arquivo(request):
    """Passo 1: recebe o arquivo, detecta colunas automaticamente e retorna sugestoes."""
    if not request.user.pode_importar:
        return Response({"detail": "Sem permissao para importar."}, status=403)

    arquivo = request.FILES.get("arquivo")
    if not arquivo:
        return Response({"detail": "Nenhum arquivo enviado."}, status=400)

    ext = Path(arquivo.name).suffix.lower()
    if ext not in (".xlsx", ".xls", ".csv"):
        return Response({"detail": f"Formato nao suportado: {ext}"}, status=400)

    temp_id = str(uuid.uuid4())
    temp_path = Path(settings.UPLOAD_TEMP_DIR) / f"{temp_id}{ext}"
    with open(temp_path, "wb") as f:
        for chunk in arquivo.chunks():
            f.write(chunk)

    try:
        analise = analisar_planilha(temp_path)
        analise["temp_id"] = temp_id
        analise["nome_arquivo"] = arquivo.name
        analise["extensao"] = ext
        return Response(analise)
    except Exception as e:
        temp_path.unlink(missing_ok=True)
        return Response({"detail": f"Erro ao ler arquivo: {str(e)}"}, status=400)


def _resolver_convenio_regiao(convenio_id, regiao_id):
    convenio = None
    regiao = None
    if convenio_id:
        try:
            convenio = Convenio.objects.get(pk=convenio_id)
        except Convenio.DoesNotExist:
            pass
    if regiao_id:
        try:
            regiao = Regiao.objects.get(pk=regiao_id)
        except Regiao.DoesNotExist:
            pass
    return convenio, regiao


def _salvar_importacao_em_lote(base, registros, convenio, regiao):
    invalidos = 0
    registros_por_cpf = {}
    cpfs_importacao = []

    for reg in registros:
        cpf = reg["cpf"]
        if not cpf or len(cpf) != 11:
            invalidos += 1
            continue

        if not reg["cpf_valido"]:
            invalidos += 1

        cpfs_importacao.append(cpf)
        registros_por_cpf.setdefault(cpf, reg)

    cpfs_unicos = list(registros_por_cpf.keys())

    inicio_etapa = time.perf_counter()
    pessoas_existentes = Pessoa.objects.in_bulk(cpfs_unicos, field_name="cpf")
    tempo_buscar_existentes = time.perf_counter() - inicio_etapa

    cpfs_existentes = set(pessoas_existentes.keys())
    cpfs_vistos = set()
    duplicados_banco = 0
    for cpf in cpfs_importacao:
        if cpf in cpfs_existentes or cpf in cpfs_vistos:
            duplicados_banco += 1
        cpfs_vistos.add(cpf)

    cpfs_novos = [cpf for cpf in cpfs_unicos if cpf not in cpfs_existentes]
    pessoas_novas = [
        Pessoa(
            cpf=cpf,
            nome=registros_por_cpf[cpf]["nome"],
            cpf_valido=registros_por_cpf[cpf]["cpf_valido"],
            data_nascimento=registros_por_cpf[cpf]["data_nascimento"],
            idade_calculada=registros_por_cpf[cpf]["idade_calculada"],
            cidade=registros_por_cpf[cpf]["cidade"],
            uf=registros_por_cpf[cpf]["uf"],
        )
        for cpf in cpfs_novos
    ]

    pessoas_para_atualizar = []
    vinculos = []
    inicio_etapa = time.perf_counter()

    with transaction.atomic():
        if pessoas_novas:
            Pessoa.objects.bulk_create(pessoas_novas, batch_size=1000)

        pessoas = Pessoa.objects.in_bulk(cpfs_unicos, field_name="cpf")

        for cpf in cpfs_existentes:
            pessoa = pessoas[cpf]
            reg = registros_por_cpf[cpf]
            atualizado = False
            if not pessoa.nome and reg["nome"]:
                pessoa.nome = reg["nome"]
                atualizado = True
            if not pessoa.cidade and reg["cidade"]:
                pessoa.cidade = reg["cidade"]
                atualizado = True
            if not pessoa.data_nascimento and reg["data_nascimento"]:
                pessoa.data_nascimento = reg["data_nascimento"]
                pessoa.idade_calculada = reg["idade_calculada"]
                atualizado = True
            if atualizado:
                pessoas_para_atualizar.append(pessoa)

        if pessoas_para_atualizar:
            Pessoa.objects.bulk_update(
                pessoas_para_atualizar,
                ["nome", "cidade", "data_nascimento", "idade_calculada"],
                batch_size=1000,
            )

        vinculos = [
            PessoaBase(
                pessoa=pessoas[cpf],
                base_importada=base,
                convenio=convenio,
                regiao=regiao,
                linha_original=registros_por_cpf[cpf].get("linha_original"),
            )
            for cpf in cpfs_unicos
            if cpf in pessoas
        ]
        if vinculos:
            PessoaBase.objects.bulk_create(vinculos, batch_size=1000, ignore_conflicts=True)

    tempo_gravar_banco = time.perf_counter() - inicio_etapa

    return {
        "novos": len(pessoas_novas),
        "duplicados": duplicados_banco,
        "invalidos": invalidos,
        "tempo_buscar_existentes": tempo_buscar_existentes,
        "tempo_gravar_banco": tempo_gravar_banco,
        "cpfs_processaveis": len(cpfs_importacao),
        "cpfs_unicos": len(cpfs_unicos),
        "pessoas_criadas": len(pessoas_novas),
        "pessoas_atualizadas": len(pessoas_para_atualizar),
        "vinculos_base": len(vinculos),
    }


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def executar_importacao(request):
    """Passo 2: executa a importacao com o mapeamento confirmado."""
    inicio_total = time.perf_counter()
    if not request.user.pode_importar:
        return Response({"detail": "Sem permissao para importar."}, status=403)

    temp_id = request.data.get("temp_id")
    nome_arquivo = request.data.get("nome_arquivo", "")
    mapeamento = request.data.get("mapeamento", {})
    convenio_id = request.data.get("convenio_id")
    regiao_id = request.data.get("regiao_id")

    if not temp_id or not mapeamento:
        return Response({"detail": "Dados incompletos."}, status=400)

    ext = request.data.get("extensao", ".xlsx")
    temp_path = Path(settings.UPLOAD_TEMP_DIR) / f"{temp_id}{ext}"
    if not temp_path.exists():
        return Response({"detail": "Arquivo temporario nao encontrado. Faca o upload novamente."}, status=400)

    convenio, regiao = _resolver_convenio_regiao(convenio_id, regiao_id)

    base = BaseImportada.objects.create(
        nome_arquivo=nome_arquivo,
        convenio=convenio,
        regiao=regiao,
        importado_por=request.user,
        status_importacao="processando",
        mapeamento_colunas=mapeamento,
    )

    try:
        inicio_etapa = time.perf_counter()
        resultado = processar_planilha(temp_path, mapeamento)
        tempo_processar = time.perf_counter() - inicio_etapa

        registros = resultado["registros"]
        erros = resultado["erros"]
        stats = resultado["stats"]

        resultado_banco = _salvar_importacao_em_lote(base, registros, convenio, regiao)
        duracao_total = time.perf_counter() - inicio_total
        metricas = {
            "total_segundos": round(duracao_total, 3),
            "processar_planilha_segundos": round(tempo_processar, 3),
            "buscar_cpfs_existentes_segundos": round(resultado_banco["tempo_buscar_existentes"], 3),
            "gravar_banco_segundos": round(resultado_banco["tempo_gravar_banco"], 3),
            "registros_processados": len(registros),
            "cpfs_processaveis": resultado_banco["cpfs_processaveis"],
            "cpfs_unicos": resultado_banco["cpfs_unicos"],
            "pessoas_criadas": resultado_banco["pessoas_criadas"],
            "pessoas_atualizadas": resultado_banco["pessoas_atualizadas"],
            "vinculos_base": resultado_banco["vinculos_base"],
        }

        base.quantidade_registros = stats["total"]
        base.quantidade_validos = stats["validos"]
        base.quantidade_invalidos = resultado_banco["invalidos"]
        base.quantidade_duplicados = resultado_banco["duplicados"]
        base.status_importacao = "concluido" if not erros else "parcial"
        base.erros_detalhados = erros[:100]
        base.duracao_segundos = duracao_total
        base.metricas_processamento = metricas
        base.save()

        temp_path.unlink(missing_ok=True)

        registrar_log(
            request.user,
            "importacao",
            f"Base importada: {nome_arquivo}",
            detalhes={
                "base_id": base.id,
                "total": stats["total"],
                "novos": resultado_banco["novos"],
                "duplicados": resultado_banco["duplicados"],
                "invalidos": resultado_banco["invalidos"],
                "duracao_segundos": round(duracao_total, 3),
                "metricas": metricas,
            },
            request=request,
        )

        return Response({
            "base_id": base.id,
            "status": base.status_importacao,
            "total": stats["total"],
            "novos": resultado_banco["novos"],
            "duplicados": resultado_banco["duplicados"],
            "invalidos": resultado_banco["invalidos"],
            "duracao_segundos": round(duracao_total, 3),
            "metricas": metricas,
            "erros": erros[:20],
        })

    except Exception as e:
        base.status_importacao = "erro"
        base.observacoes = str(e)
        base.duracao_segundos = time.perf_counter() - inicio_total
        base.save()
        temp_path.unlink(missing_ok=True)
        registrar_log(request.user, "error", f"Erro na importacao: {nome_arquivo}", detalhes={"erro": str(e)})
        return Response({"detail": f"Erro durante importacao: {str(e)}"}, status=500)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def bases_list(request):
    bases = BaseImportada.objects.select_related(
        "convenio", "regiao", "importado_por"
    ).order_by("-data_importacao")

    convenio_id = request.GET.get("convenio_id")
    status = request.GET.get("status")
    if convenio_id:
        bases = bases.filter(convenio_id=convenio_id)
    if status:
        bases = bases.filter(status_importacao=status)

    dados = [
        {
            "id": b.id,
            "nome_arquivo": b.nome_arquivo,
            "convenio": b.convenio.nome_convenio if b.convenio else None,
            "regiao": b.regiao.nome_regiao if b.regiao else None,
            "quantidade_registros": b.quantidade_registros,
            "quantidade_validos": b.quantidade_validos,
            "quantidade_invalidos": b.quantidade_invalidos,
            "quantidade_duplicados": b.quantidade_duplicados,
            "importado_por": b.importado_por.nome if b.importado_por else None,
            "data_importacao": b.data_importacao.strftime("%d/%m/%Y %H:%M"),
            "status_importacao": b.status_importacao,
            "observacoes": b.observacoes,
            "duracao_segundos": b.duracao_segundos,
            "metricas_processamento": b.metricas_processamento,
        }
        for b in bases[:100]
    ]
    return Response(dados)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def sobreposicao(request):
    """Compara duas bases e retorna CPFs em comum."""
    base1_id = request.GET.get("base1_id")
    base2_id = request.GET.get("base2_id")

    if not base1_id or not base2_id:
        return Response({"detail": "base1_id e base2_id sao obrigatorios."}, status=400)

    try:
        base1 = BaseImportada.objects.get(pk=base1_id)
        base2 = BaseImportada.objects.get(pk=base2_id)
    except BaseImportada.DoesNotExist:
        return Response({"detail": "Uma das bases nao foi encontrada."}, status=404)

    cpfs1 = set(PessoaBase.objects.filter(base_importada=base1).values_list("pessoa__cpf", flat=True))
    cpfs2 = set(PessoaBase.objects.filter(base_importada=base2).values_list("pessoa__cpf", flat=True))

    sobrepostos = cpfs1 & cpfs2
    apenas1 = cpfs1 - cpfs2
    apenas2 = cpfs2 - cpfs1
    pct = round(len(sobrepostos) / max(len(cpfs1), 1) * 100, 1)

    return Response({
        "base1": {"id": base1.id, "nome": base1.nome_arquivo, "total": len(cpfs1)},
        "base2": {"id": base2.id, "nome": base2.nome_arquivo, "total": len(cpfs2)},
        "sobrepostos": len(sobrepostos),
        "apenas_base1": len(apenas1),
        "apenas_base2": len(apenas2),
        "percentual_sobreposicao": pct,
    })


@api_view(["GET", "DELETE"])
@permission_classes([IsAuthenticated])
def base_detail(request, pk):
    try:
        b = BaseImportada.objects.select_related("convenio", "regiao", "importado_por").get(pk=pk)
    except BaseImportada.DoesNotExist:
        return Response({"detail": "Base nao encontrada."}, status=404)

    if request.method == "DELETE":
        if request.user.perfil != "administrador":
            return Response({"detail": "Apenas administradores podem excluir bases."}, status=403)

        excluir_cpfs_orfaos = request.data.get("excluir_cpfs_orfaos", False)

        cpfs_excluidos = 0
        if excluir_cpfs_orfaos:
            ids_so_nesta_base = (
                PessoaBase.objects
                .values("pessoa_id")
                .annotate(total_bases=Count("base_importada", distinct=True))
                .filter(base_importada=b, total_bases=1)
                .values_list("pessoa_id", flat=True)
            )
            cpfs_excluidos = Pessoa.objects.filter(id__in=ids_so_nesta_base).count()
            Pessoa.objects.filter(id__in=ids_so_nesta_base).delete()

        nome = b.nome_arquivo
        qtd = b.quantidade_validos
        b.delete()

        registrar_log(
            request.user, "warning",
            f"Base excluida: {nome}",
            detalhes={
                "nome_arquivo": nome,
                "quantidade": qtd,
                "cpfs_orfaos_excluidos": cpfs_excluidos,
            },
            request=request,
        )
        return Response({
            "detail": "Base excluida com sucesso.",
            "cpfs_orfaos_excluidos": cpfs_excluidos,
        })

    total_pb = b.pessoas_base.count()
    com_nome = b.pessoas_base.filter(
        Q(pessoa__nome__isnull=False) & ~Q(pessoa__nome="")
    ).count() if total_pb else 0
    com_cidade = b.pessoas_base.filter(
        Q(pessoa__cidade__isnull=False) & ~Q(pessoa__cidade="")
    ).count() if total_pb else 0
    com_nasc = b.pessoas_base.filter(
        pessoa__data_nascimento__isnull=False
    ).count() if total_pb else 0

    pct = lambda n: round(n / total_pb * 100) if total_pb else 0

    return Response({
        "id": b.id,
        "nome_arquivo": b.nome_arquivo,
        "convenio": b.convenio.nome_convenio if b.convenio else None,
        "regiao": b.regiao.nome_regiao if b.regiao else None,
        "quantidade_registros": b.quantidade_registros,
        "quantidade_validos": b.quantidade_validos,
        "quantidade_invalidos": b.quantidade_invalidos,
        "quantidade_duplicados": b.quantidade_duplicados,
        "importado_por": b.importado_por.nome if b.importado_por else None,
        "data_importacao": b.data_importacao.strftime("%d/%m/%Y %H:%M"),
        "status_importacao": b.status_importacao,
        "mapeamento_colunas": b.mapeamento_colunas,
        "erros_detalhados": b.erros_detalhados,
        "observacoes": b.observacoes,
        "duracao_segundos": b.duracao_segundos,
        "metricas_processamento": b.metricas_processamento,
        "qualidade": {
            "pct_nome": pct(com_nome),
            "pct_cidade": pct(com_cidade),
            "pct_nascimento": pct(com_nasc),
        },
    })

