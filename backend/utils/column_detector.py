"""
Detecção automática de colunas de planilhas por similaridade de texto.
"""
from difflib import SequenceMatcher

# Mapa de campo padrão → variações possíveis encontradas nas planilhas
COLUMN_MAP: dict[str, list[str]] = {
    "cpf": [
        "cpf", "cpf_cliente", "cpf_servidor", "documento", "cadastro",
        "numero_cpf", "num_cpf", "doc", "cpf_beneficiario", "nr_cpf",
        "cpf servidor", "cpf cliente", "numero do cpf", "numéro cpf",
    ],
    "nome": [
        "nome", "cliente", "nome_cliente", "servidor", "nome_servidor",
        "beneficiario", "beneficiário", "segurado", "nome_completo",
        "nome completo", "nome do servidor", "nome do cliente",
    ],
    "data_nascimento": [
        "nascimento", "data_nasc", "dt_nasc", "nasc", "data_nascimento",
        "dt_nascimento", "data de nascimento", "data nascimento",
        "dt_nasc_serv", "nascimento_servidor",
    ],
    "idade": [
        "idade", "idade_atual", "anos", "age", "idade atual",
    ],
    "cidade": [
        "cidade", "municipio", "município", "localidade", "municipio_servidor",
        "cidade_residencia", "mun", "cidade residencia",
    ],
    "uf": [
        "uf", "estado", "sigla_estado", "sigla_uf", "uf_servidor",
        "estado_uf", "uf servidor",
    ],
    "convenio": [
        "convenio", "convênio", "orgao", "órgão", "orgao_pagador",
        "produto", "base", "fonte_pagadora", "orgao pagador",
    ],
    "regiao": [
        "regiao", "região", "regional", "local", "territorio",
        "território", "area", "zona", "macrorregiao", "macrorregião",
    ],
}

# Palavras-chave no nome do arquivo → convênio sugerido
CONVENIO_KEYWORDS: dict[str, list[str]] = {
    "Governo da Bahia": ["governo", "govba", "gov_ba", "govbahia", "estado", "servidor"],
    "INSS": ["inss", "previdencia", "previdência", "beneficio", "benefício", "aposentadoria", "rmi"],
    "TJBA": ["tjba", "tribunal", "justica", "justiça", "magistratura", "judiciario"],
    "SIAPE": ["siape", "federal", "uniao", "união"],
}

# Palavras-chave no nome do arquivo → região sugerida
REGIAO_KEYWORDS: dict[str, list[str]] = {
    "Salvador": ["salvador", "capital", "ssa", "salvador_ba"],
    "Centro-Oeste": ["centro", "oeste", "centroeste", "centro_oeste"],
    "Nordeste": ["nordeste", "ne_ba", "nordeste_ba"],
    "Feira de Santana": ["feira", "fsantana", "feira_santana"],
    "Sul": ["sul", "sul_ba", "vitoria_conquista", "conquista"],
    "Extremo Sul": ["extremo", "extremosul", "extremo_sul"],
    "Sudoeste": ["sudoeste", "sw_ba"],
    "Recôncavo": ["reconcavo", "recôncavo", "santo_antonio"],
    "Chapada Diamantina": ["chapada", "diamantina", "lencois"],
}


def _similaridade(a: str, b: str) -> float:
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


def detectar_coluna(header: str, threshold: float = 0.72) -> tuple[str | None, float]:
    """
    Retorna (campo_padrão, confiança) para um cabeçalho dado.
    Confiança vai de 0.0 a 1.0.
    """
    header_clean = header.lower().strip().replace(" ", "_").replace("-", "_")

    melhor_campo = None
    melhor_conf = 0.0

    for campo, sinonimos in COLUMN_MAP.items():
        for sinonimo in sinonimos:
            # Correspondência exata
            if header_clean == sinonimo.replace(" ", "_"):
                return campo, 1.0

            # Verificar se o cabeçalho contém o sinônimo
            if sinonimo.replace(" ", "_") in header_clean:
                conf = 0.90
                if conf > melhor_conf:
                    melhor_conf = conf
                    melhor_campo = campo

            # Similaridade
            conf = _similaridade(header_clean, sinonimo.replace(" ", "_"))
            if conf > melhor_conf and conf >= threshold:
                melhor_conf = conf
                melhor_campo = campo

    return melhor_campo, melhor_conf


def auto_mapear_colunas(headers: list[str]) -> dict:
    """
    Recebe lista de cabeçalhos e retorna mapeamento automático.
    Retorna dict: { header_original: { campo_padrao, confianca, requer_revisao } }
    """
    resultado = {}
    campos_usados = set()

    for header in headers:
        campo, confianca = detectar_coluna(header)

        # Evitar mapear o mesmo campo para dois cabeçalhos
        if campo and campo in campos_usados:
            campo = None
            confianca = 0.0

        if campo:
            campos_usados.add(campo)

        resultado[header] = {
            "campo_padrao": campo,
            "confianca": round(confianca, 2),
            "requer_revisao": campo is not None and confianca < 0.80,
        }

    return resultado


def sugerir_convenio(nome_arquivo: str) -> str | None:
    """Sugere um convênio com base no nome do arquivo."""
    nome = nome_arquivo.lower()
    for convenio, keywords in CONVENIO_KEYWORDS.items():
        if any(k in nome for k in keywords):
            return convenio
    return None


def sugerir_regiao(nome_arquivo: str) -> str | None:
    """Sugere uma região com base no nome do arquivo."""
    nome = nome_arquivo.lower()
    for regiao, keywords in REGIAO_KEYWORDS.items():
        if any(k in nome for k in keywords):
            return regiao
    return None

