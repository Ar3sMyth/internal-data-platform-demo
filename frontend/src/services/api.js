import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

// Injeta token automaticamente em toda requisição
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Token ${token}`;
  return config;
});

// Redireciona para login se token expirar
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("usuario");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// ── Auth ───────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (email, senha) => api.post("/auth/login/", { email, senha }),
  logout: () => api.post("/auth/logout/"),
  me: () => api.get("/auth/me/"),
  alterarSenha: (dados) => api.post("/auth/alterar-senha/", dados),
  listarUsuarios: () => api.get("/auth/usuarios/"),
  criarUsuario: (dados) => api.post("/auth/usuarios/", dados),
  atualizarUsuario: (id, dados) => api.patch(`/auth/usuarios/${id}/`, dados),
  excluirUsuario: (id) => api.delete(`/auth/usuarios/${id}/`),
  backup: () => api.get("/auth/backup/", { responseType: "blob" }),
};

// ── Convênios ──────────────────────────────────────────────────────────────
export const conveniosAPI = {
  listar: () => api.get("/convenios/"),
  criarConvenio: (dados) => api.post("/convenios/", dados),
  editarConvenio: (id, dados) => api.patch(`/convenios/${id}/`, dados),
  excluirConvenio: (id) => api.delete(`/convenios/${id}/`),
  listarRegioes: (convenioId) => api.get(`/convenios/${convenioId}/regioes/`),
  criarRegiao: (convenioId, dados) => api.post(`/convenios/${convenioId}/regioes/`, dados),
  excluirRegiao: (convenioId, regiaoId) => api.delete(`/convenios/${convenioId}/regioes/${regiaoId}/`),
};

// ── Pessoas / Busca ────────────────────────────────────────────────────────
export const pessoasAPI = {
  buscar: (params) => api.get("/pessoas/busca/", { params }),
  buscarLote: (cpfs) => api.post("/pessoas/busca-lote/", { cpfs }),
  detalhe: (id) => api.get(`/pessoas/${id}/`),
  editar: (id, dados) => api.patch(`/pessoas/${id}/`, dados),
  editarMassa: (ids, campos) => api.post("/pessoas/editar-massa/", { ids, campos }),
  bloquear: (id, dados) => api.post(`/pessoas/${id}/bloquear/`, dados),
  historico: (id) => api.get(`/pessoas/${id}/historico/`),
  excluirUm: (id) => api.delete(`/pessoas/${id}/`),
  excluir: (ids) => api.post("/pessoas/excluir/", { ids }),
  dashboard: () => api.get("/pessoas/dashboard/"),
};

// ── Importação ─────────────────────────────────────────────────────────────
export const importacaoAPI = {
  analisar: (formData) =>
    api.post("/importacao/analisar/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  executar: (dados) => api.post("/importacao/executar/", dados),
  listarBases: (params) => api.get("/importacao/bases/", { params }),
  detalheBase: (id) => api.get(`/importacao/bases/${id}/`),
  excluirBase: (id, opcoes = {}) => api.delete(`/importacao/bases/${id}/`, { data: opcoes }),
  sobreposicao: (base1Id, base2Id) => api.get("/importacao/sobreposicao/", { params: { base1_id: base1Id, base2_id: base2Id } }),
};

// ── Exportação ─────────────────────────────────────────────────────────────
export const exportacaoAPI = {
  exportar: (dados) =>
    api.post("/exportacao/exportar/", dados, {
      responseType: "blob",
      transformResponse: [(data, headers) => {
        // Retorna blob direto para download, exceto clipboard
        if (headers["content-type"]?.includes("application/json")) {
          return JSON.parse(new TextDecoder().decode(data));
        }
        return data;
      }],
    }),
  exportarClipboard: (dados) =>
    api.post("/exportacao/exportar/", { ...dados, formato: "clipboard" }),
  exportarCompleto: (dados) =>
    api.post("/exportacao/exportar-completo/", dados, { responseType: "blob" }),
  historico: () => api.get("/exportacao/historico/"),
  previsualizar: (params) => api.get("/exportacao/previsualizar/", { params }),
  listarTemplates: () => api.get("/exportacao/templates/"),
  criarTemplate: (dados) => api.post("/exportacao/templates/", dados),
  excluirTemplate: (id) => api.delete(`/exportacao/templates/${id}/`),
};

// ── Logs ───────────────────────────────────────────────────────────────────
export const logsAPI = {
  listar: (params) => api.get("/logs/", { params }),
};

// ── Helper: download de blob ───────────────────────────────────────────────
export function downloadBlob(blob, nomeArquivo) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default api;

