"""
Script de configuracao inicial: cria superusuario e convenios padrao.
Execute uma vez apos 'python manage.py migrate'.
"""
import os
import sys
import django

# Garante encoding correto no Windows
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from apps.usuarios.models import Usuario
from apps.convenios.models import Convenio, Regiao

# Usuario administrador
email_admin = "admin@demo.com"
senha_admin = "demo26*"
if not Usuario.objects.filter(email=email_admin).exists():
    Usuario.objects.create_superuser(
        email=email_admin,
        nome="Administrador",
        senha=senha_admin,
    )
    print(f"[OK] Usuario criado: {email_admin} / senha: {senha_admin}")
else:
    print(f"[INFO] Usuario {email_admin} ja existe.")

# Convenios e regioes padrao
DADOS = {
    "Governo da Bahia": [
        "Salvador", "Centro-Oeste", "Nordeste", "Feira de Santana",
        "Sul", "Extremo Sul", "Sudoeste", "Reconcavo", "Chapada Diamantina",
    ],
    "INSS": ["Salvador", "Feira de Santana", "Vitoria da Conquista", "Ilheus"],
    "TJBA": ["Salvador", "Interior"],
    "SIAPE": ["Bahia"],
}

for nome_conv, regioes in DADOS.items():
    conv, criado = Convenio.objects.get_or_create(nome_convenio=nome_conv)
    status = "[CRIADO]" if criado else "[JA EXISTE]"
    print(f"{status}: {nome_conv}")
    for nome_reg in regioes:
        reg, criado_r = Regiao.objects.get_or_create(nome_regiao=nome_reg, convenio=conv)
        if criado_r:
            print(f"   + Regiao: {nome_reg}")

print("")
print("[OK] Setup inicial concluido! Acesse http://localhost:5173")
print("")
print("Login inicial:")
print("  E-mail: admin@demo.com")
print(f"  Senha:  {senha_admin}")

