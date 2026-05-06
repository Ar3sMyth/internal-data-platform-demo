from django.urls import path
from . import views

urlpatterns = [
    path("exportar/", views.exportar),
    path("exportar-completo/", views.exportar_completo),
    path("historico/", views.historico_exportacoes),
    path("previsualizar/", views.previsualizar_exportacao),
    path("templates/", views.templates_list),
    path("templates/<int:pk>/", views.template_detail),
]

