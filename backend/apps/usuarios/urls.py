from django.urls import path
from . import views

urlpatterns = [
    path("login/", views.login_view),
    path("logout/", views.logout_view),
    path("me/", views.me_view),
    path("alterar-senha/", views.alterar_senha),
    path("usuarios/", views.usuarios_list),
    path("usuarios/<int:pk>/", views.usuario_detail),
    path("backup/", views.backup_db),
]

