from django.urls import path
from . import views

urlpatterns = [
    path("", views.convenios_list),
    path("<int:pk>/", views.convenio_detail),
    path("<int:convenio_id>/regioes/", views.regioes_list),
    path("<int:convenio_id>/regioes/<int:regiao_id>/", views.regiao_detail),
]

