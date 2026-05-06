from .settings import *
from pathlib import Path

DEBUG = False

REACT_DIST_DIR = BASE_DIR.parent / "frontend" / "dist"

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

# WhiteNoise serve arquivos estáticos do React no diretório raiz
WHITENOISE_ROOT = str(REACT_DIST_DIR)

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# Permite acesso de qualquer IP da rede local
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

