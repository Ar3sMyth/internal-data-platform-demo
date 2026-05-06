from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import Usuario


class UsuarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = ["id", "nome", "email", "perfil", "ativo", "ultimo_acesso", "criado_em"]
        read_only_fields = ["id", "ultimo_acesso", "criado_em"]


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    senha = serializers.CharField(write_only=True)

    def validate(self, data):
        user = authenticate(username=data["email"], password=data["senha"])
        if not user:
            raise serializers.ValidationError("E-mail ou senha incorretos.")
        if not user.ativo:
            raise serializers.ValidationError("Usuário desativado. Contate o administrador.")
        data["user"] = user
        return data


class AlterarSenhaSerializer(serializers.Serializer):
    senha_atual = serializers.CharField(write_only=True)
    nova_senha = serializers.CharField(write_only=True, min_length=6)

    def validate_senha_atual(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Senha atual incorreta.")
        return value

