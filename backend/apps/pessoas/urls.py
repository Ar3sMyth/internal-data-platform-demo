from django.urls import path
from . import views

urlpatterns = [
    path("busca/", views.pessoas_busca),
    path("busca-lote/", views.busca_lote),
    path("excluir/", views.excluir_pessoas),
    path("editar-massa/", views.editar_massa),
    path("<int:pk>/", views.pessoa_detail),
    path("<int:pk>/bloquear/", views.bloquear_cpf),
    path("<int:pk>/historico/", views.historico_cpf),
    path("dashboard/", views.dashboard_stats),
]

