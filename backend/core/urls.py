from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.http import FileResponse, Http404, HttpResponse
from pathlib import Path


def react_app(request, path=""):
    index = Path(settings.BASE_DIR).parent / "frontend" / "dist" / "index.html"
    if index.exists():
        return HttpResponse(
            index.read_text(encoding="utf-8"),
            content_type="text/html; charset=utf-8",
        )
    return HttpResponse(
        "<h3>Frontend não compilado.<br>"
        "Execute dentro de <code>sistema/frontend/</code>:<br>"
        "<code>npm install &amp;&amp; npm run build</code></h3>",
        status=503,
        content_type="text/html",
    )


def react_dist_file(request, path):
    dist_dir = (Path(settings.BASE_DIR).parent / "frontend" / "dist").resolve()
    arquivo = (dist_dir / path).resolve()
    if not arquivo.is_file() or dist_dir not in arquivo.parents:
        raise Http404("Arquivo nao encontrado.")
    return FileResponse(open(arquivo, "rb"))


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("apps.usuarios.urls")),
    path("api/convenios/", include("apps.convenios.urls")),
    path("api/pessoas/", include("apps.pessoas.urls")),
    path("api/importacao/", include("apps.importacao.urls")),
    path("api/exportacao/", include("apps.exportacao.urls")),
    path("api/logs/", include("apps.logs.urls")),
    re_path(r"^(?P<path>assets/.*|icone.ico|favicon.svg|icons.svg|)$", react_dist_file),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Catch-all: entrega o React para todas as rotas não-API (SPA routing)
urlpatterns += [re_path(r"^.*$", react_app)]

