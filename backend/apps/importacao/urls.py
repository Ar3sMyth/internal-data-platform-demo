from django.urls import path
from . import views

urlpatterns = [
    path("analisar/", views.analisar_arquivo),
    path("executar/", views.executar_importacao),
    path("bases/", views.bases_list),
    path("bases/<int:pk>/", views.base_detail),
    path("sobreposicao/", views.sobreposicao),
]

