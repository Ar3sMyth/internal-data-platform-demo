from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class UsuarioManager(BaseUserManager):
    def create_user(self, email, nome, senha=None, **extra_fields):
        if not email:
            raise ValueError("O e-mail é obrigatório")
        email = self.normalize_email(email)
        user = self.model(email=email, nome=nome, **extra_fields)
        user.set_password(senha)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, nome, senha=None, **extra_fields):
        extra_fields.setdefault("perfil", "administrador")
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        return self.create_user(email, nome, senha, **extra_fields)


class Usuario(AbstractBaseUser, PermissionsMixin):
    PERFIL_CHOICES = [
        ("administrador", "Administrador"),
        ("operador", "Operador"),
        ("visualizador", "Visualizador"),
    ]

    nome = models.CharField(max_length=200)
    email = models.EmailField(unique=True)
    perfil = models.CharField(max_length=20, choices=PERFIL_CHOICES, default="operador")
    ativo = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)
    ultimo_acesso = models.DateTimeField(null=True, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["nome"]

    objects = UsuarioManager()

    class Meta:
        verbose_name = "Usuário"
        verbose_name_plural = "Usuários"
        db_table = "usuarios"

    def __str__(self):
        return f"{self.nome} ({self.perfil})"

    @property
    def pode_importar(self):
        return self.perfil in ("administrador", "operador")

    @property
    def pode_exportar(self):
        return self.perfil in ("administrador", "operador")

    @property
    def pode_ver_cpf_completo(self):
        return self.perfil in ("administrador", "operador")

    @property
    def pode_gerenciar_usuarios(self):
        return self.perfil == "administrador"

