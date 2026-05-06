"""
Parser de planilhas (.xlsx, .xls, .csv) com detecção automática de colunas.
"""
import pandas as pd
from pathlib import Path
from datetime import date, datetime
from dateutil import parser as dateutil_parser

from utils.cpf_utils import padronizar_cpf, validar_cpf
from utils.column_detector import auto_mapear_colunas, sugerir_convenio, sugerir_regiao


def ler_planilha(caminho: str | Path) -> pd.DataFrame:
    """Lê arquivo .xlsx, .xls ou .csv e retorna DataFrame."""
    caminho = Path(caminho)
    ext = caminho.suffix.lower()

    if ext in (".xlsx",):
        df = pd.read_excel(caminho, dtype=str, engine="openpyxl")
    elif ext in (".xls",):
        df = pd.read_excel(caminho, dtype=str, engine="xlrd")
    elif ext in (".csv",):
        # Tenta diferentes separadores automaticamente
        for sep in [";", ",", "\t", "|"]:
            try:
                df = pd.read_csv(caminho, dtype=str, sep=sep, encoding="utf-8-sig")
                if df.shape[1] > 1:
                    break
            except Exception:
                continue
        else:
            df = pd.read_csv(caminho, dtype=str, encoding="latin-1")
    else:
        raise ValueError(f"Formato não suportado: {ext}")

    # Remove linhas completamente vazias
    df = df.dropna(how="all")
    # Remove colunas sem nome
    df = df.loc[:, df.columns.notna()]
    df.columns = [str(c).strip() for c in df.columns]

    return df


def calcular_idade(data_nascimento: date | None) -> int | None:
    """Calcula idade pela data de nascimento."""
    if not data_nascimento:
        return None
    hoje = date.today()
    try:
        aniversario_este_ano = data_nascimento.replace(year=hoje.year)
        idade = hoje.year - data_nascimento.year
        if aniversario_este_ano > hoje:
            idade -= 1
        if 0 <= idade <= 130:
            return idade
    except Exception:
        pass
    return None


def parse_data_nascimento(valor: str | None) -> date | None:
    """Tenta converter string em data de nascimento."""
    if not valor or str(valor).strip() in ("", "nan", "None", "NaT"):
        return None
    valor = str(valor).strip()
    try:
        dt = dateutil_parser.parse(valor, dayfirst=True)
        return dt.date()
    except Exception:
        pass
    # Tenta formato numérico do Excel (dias desde 1900-01-01)
    try:
        n = float(valor)
        if 1000 < n < 100000:
            from datetime import timedelta
            base = date(1899, 12, 30)
            return base + timedelta(days=int(n))
    except Exception:
        pass
    return None


def parse_idade(valor: str | None) -> int | None:
    """Tenta extrair idade como inteiro."""
    if not valor or str(valor).strip() in ("", "nan", "None"):
        return None
    try:
        idade = int(float(str(valor).strip()))
        if 0 <= idade <= 130:
            return idade
    except Exception:
        pass
    return None


def normalizar_cidade(cidade: str | None) -> str | None:
    """Normaliza nome de cidade."""
    if not cidade or str(cidade).strip() in ("", "nan", "None"):
        return None
    return str(cidade).strip().title()


def normalizar_uf(uf: str | None) -> str | None:
    """Normaliza UF para 2 letras maiúsculas."""
    if not uf or str(uf).strip() in ("", "nan", "None"):
        return None
    return str(uf).strip().upper()[:2]


def processar_planilha(caminho: str | Path, mapeamento_confirmado: dict) -> dict:
    """
    Processa a planilha com o mapeamento de colunas confirmado.

    mapeamento_confirmado: { "coluna_original": "campo_padrao" }
    Campos padrão: cpf, nome, data_nascimento, idade, cidade, uf, convenio, regiao

    Retorna dict com:
      - registros: lista de dicts prontos para salvar
      - erros: lista de { linha, motivo }
      - stats: { total, validos, invalidos, duplicados_provisorio }
    """
    df = ler_planilha(caminho)
    registros = []
    erros = []
    cpfs_vistos = set()

    # Inverte mapeamento: campo_padrao → coluna_original
    mapa_inv = {v: k for k, v in mapeamento_confirmado.items() if v}

    def get_col(row, campo):
        col = mapa_inv.get(campo)
        if col and col in row.index:
            val = row[col]
            return None if str(val).strip() in ("", "nan", "None", "NaT") else str(val).strip()
        return None

    for idx, row in df.iterrows():
        linha_num = idx + 2  # +2 porque linha 1 é cabeçalho

        raw_cpf = get_col(row, "cpf")
        if not raw_cpf:
            erros.append({"linha": linha_num, "motivo": "CPF ausente"})
            continue

        cpf = padronizar_cpf(raw_cpf)
        cpf_valido = validar_cpf(cpf)

        if not cpf_valido:
            erros.append({"linha": linha_num, "motivo": f"CPF inválido: {raw_cpf}", "cpf": raw_cpf})
            # Ainda salva o registro, marcado como inválido

        duplicado = cpf in cpfs_vistos
        if duplicado:
            erros.append({"linha": linha_num, "motivo": f"CPF duplicado na planilha: {cpf}", "cpf": cpf})

        cpfs_vistos.add(cpf)

        # Data de nascimento e idade
        raw_nasc = get_col(row, "data_nascimento")
        data_nasc = parse_data_nascimento(raw_nasc)
        idade_calc = calcular_idade(data_nasc)

        # Se não tem data de nascimento, tenta ler idade direta
        if idade_calc is None:
            raw_idade = get_col(row, "idade")
            idade_calc = parse_idade(raw_idade)

        registro = {
            "cpf": cpf,
            "cpf_valido": cpf_valido,
            "nome": get_col(row, "nome"),
            "data_nascimento": data_nasc,
            "idade_calculada": idade_calc,
            "cidade": normalizar_cidade(get_col(row, "cidade")),
            "uf": normalizar_uf(get_col(row, "uf")),
            "duplicado_na_planilha": duplicado,
            "linha_original": linha_num,
            "dados_originais": row.to_dict(),
        }

        registros.append(registro)

    validos = sum(1 for r in registros if r["cpf_valido"])
    invalidos = sum(1 for r in registros if not r["cpf_valido"])
    dup_planilha = sum(1 for r in registros if r["duplicado_na_planilha"])

    return {
        "registros": registros,
        "erros": erros,
        "stats": {
            "total": len(registros),
            "validos": validos,
            "invalidos": invalidos,
            "duplicados_na_planilha": dup_planilha,
        },
    }


def analisar_planilha(caminho: str | Path) -> dict:
    """
    Lê apenas o cabeçalho e as primeiras linhas para detecção automática.
    Retorna mapeamento sugerido e preview dos dados.
    """
    df = ler_planilha(caminho)
    headers = list(df.columns)
    mapeamento = auto_mapear_colunas(headers)

    nome_arquivo = Path(caminho).name
    convenio_sugerido = sugerir_convenio(nome_arquivo)
    regiao_sugerida = sugerir_regiao(nome_arquivo)

    # Preview: primeiras 5 linhas
    preview = df.head(5).fillna("").to_dict(orient="records")

    tem_data_nasc = any(
        v["campo_padrao"] == "data_nascimento" for v in mapeamento.values()
    )
    tem_idade = any(
        v["campo_padrao"] == "idade" for v in mapeamento.values()
    )

    avisos = []
    if not tem_data_nasc and not tem_idade:
        avisos.append("Nenhuma coluna de data de nascimento ou idade encontrada. A idade não será calculada.")
    elif not tem_data_nasc and tem_idade:
        avisos.append("Apenas coluna de idade encontrada. A data de nascimento não estará disponível.")

    tem_cpf = any(v["campo_padrao"] == "cpf" for v in mapeamento.values())
    if not tem_cpf:
        avisos.append("⚠ Nenhuma coluna de CPF detectada automaticamente. Mapeamento manual necessário.")

    return {
        "headers": headers,
        "mapeamento": mapeamento,
        "total_linhas": len(df),
        "preview": preview,
        "convenio_sugerido": convenio_sugerido,
        "regiao_sugerida": regiao_sugerida,
        "avisos": avisos,
    }

