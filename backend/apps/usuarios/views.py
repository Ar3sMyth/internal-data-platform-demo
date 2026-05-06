from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.authtoken.models import Token

from .models import Usuario
from .serializers import UsuarioSerializer, LoginSerializer, AlterarSenhaSerializer
from apps.logs.utils import registrar_log


@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.validated_data["user"]

    token, _ = Token.objects.get_or_create(user=user)
    user.ultimo_acesso = timezone.now()
    user.save(update_fields=["ultimo_acesso"])

    registrar_log(user, "acesso", "Login realizado", request=request)

    return Response({
        "token": token.key,
        "usuario": UsuarioSerializer(user).data,
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout_view(request):
    request.user.auth_token.delete()
    registrar_log(request.user, "acesso", "Logout realizado", request=request)
    return Response({"detail": "Logout realizado com sucesso."})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me_view(request):
    return Response(UsuarioSerializer(request.user).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def alterar_senha(request):
    serializer = AlterarSenhaSerializer(data=request.data, context={"request": request})
    serializer.is_valid(raise_exception=True)
    request.user.set_password(serializer.validated_data["nova_senha"])
    request.user.save()
    # Renova token após troca de senha
    request.user.auth_token.delete()
    token = Token.objects.create(user=request.user)
    registrar_log(request.user, "seguranca", "Senha alterada", request=request)
    return Response({"detail": "Senha alterada com sucesso.", "token": token.key})


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def usuarios_list(request):
    if not request.user.pode_gerenciar_usuarios:
        return Response({"detail": "Sem permissão."}, status=403)

    if request.method == "GET":
        users = Usuario.objects.all().order_by("nome")
        return Response(UsuarioSerializer(users, many=True).data)

    # POST — criar usuário
    data = request.data
    try:
        user = Usuario.objects.create_user(
            email=data["email"],
            nome=data["nome"],
            senha=data.get("senha", "demo26*"),
            perfil=data.get("perfil", "operador"),
        )
        registrar_log(request.user, "info", f"Usuário criado: {user.email}")
        return Response(UsuarioSerializer(user).data, status=201)
    except Exception as e:
        return Response({"detail": str(e)}, status=400)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def backup_db(request):
    """Download do Data Platform SQLite. Apenas administradores."""
    if request.user.perfil != "administrador":
        return Response({"detail": "Apenas administradores podem fazer backup."}, status=403)

    from django.conf import settings
    from django.http import FileResponse
    import os
    from datetime import datetime

    db_path = settings.DATABASES["default"]["NAME"]
    if not os.path.exists(str(db_path)):
        return Response({"detail": "Arquivo de banco nao encontrado."}, status=404)

    nome_arquivo = f"demo_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.sqlite3"
    registrar_log(request.user, "warning", "Backup do Data Platform baixado", request=request)
    response = FileResponse(open(str(db_path), "rb"), content_type="application/octet-stream")
    response["Content-Disposition"] = f'attachment; filename="{nome_arquivo}"'
    return response


@api_view(["PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def usuario_detail(request, pk):
    if not request.user.pode_gerenciar_usuarios:
        return Response({"detail": "Sem permissão."}, status=403)
    try:
        user = Usuario.objects.get(pk=pk)
    except Usuario.DoesNotExist:
        return Response({"detail": "Usuário não encontrado."}, status=404)

    if request.method == "PATCH":
        for campo in ["nome", "perfil", "ativo"]:
            if campo in request.data:
                setattr(user, campo, request.data[campo])
        user.save()
        return Response(UsuarioSerializer(user).data)

    if request.method == "DELETE":
        if user.pk == request.user.pk:
            return Response({"detail": "Não é possível excluir seu próprio usuário."}, status=400)
        user.delete()
        return Response(status=204)

