"""
Utilitários para validação, padronização e formatação de CPFs.
"""
import re


def padronizar_cpf(cpf: str) -> str:
    """Remove qualquer formatação e retorna apenas os 11 dígitos."""
    if not cpf:
        return ""
    digits = re.sub(r"\D", "", str(cpf))
    return digits.zfill(11) if 1 <= len(digits) <= 11 else digits


def validar_cpf(cpf: str) -> bool:
    """Valida CPF pelos dígitos verificadores."""
    cpf = padronizar_cpf(cpf)

    if len(cpf) != 11:
        return False

    # CPFs com todos os dígitos iguais são inválidos
    if cpf == cpf[0] * 11:
        return False

    # Primeiro dígito verificador
    soma = sum(int(cpf[i]) * (10 - i) for i in range(9))
    d1 = (soma * 10 % 11) % 10
    if d1 != int(cpf[9]):
        return False

    # Segundo dígito verificador
    soma = sum(int(cpf[i]) * (11 - i) for i in range(10))
    d2 = (soma * 10 % 11) % 10
    return d2 == int(cpf[10])


def formatar_cpf(cpf: str) -> str:
    """Formata CPF com pontuação: 000.000.000-00"""
    cpf = padronizar_cpf(cpf)
    if len(cpf) == 11:
        return f"{cpf[:3]}.{cpf[3:6]}.{cpf[6:9]}-{cpf[9:]}"
    return cpf


def mascarar_cpf(cpf: str) -> str:
    """Mascara o CPF para exibição sem permissão: ***.xxx.***-**"""
    cpf = padronizar_cpf(cpf)
    if len(cpf) == 11:
        return f"***.{cpf[3:6]}.*{cpf[7:8]}*-**"
    return "***.***.***-**"

