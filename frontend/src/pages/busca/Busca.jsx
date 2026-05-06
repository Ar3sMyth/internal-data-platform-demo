import { useState, useEffect, useCallback } from "react";
import { pessoasAPI, conveniosAPI } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";
import {
  MagnifyingGlassIcon, FunnelIcon, ArrowDownTrayIcon,
  PencilSquareIcon, XMarkIcon, CheckIcon, TrashIcon,
  ExclamationTriangleIcon, LockClosedIcon, LockOpenIcon,
  ChatBubbleBottomCenterTextIcon, ListBulletIcon, PencilIcon,
} from "@heroicons/react/24/outline";

// ─── Modal: Editar registro ────────────────────────────────────────────────
function ModalEditar({ pessoa, onSalvo, onFechar }) {
  const [form, setForm] = useState({
    nome: pessoa.nome || "",
    cidade: pessoa.cidade || "",
    uf: pessoa.uf || "",
    data_nascimento: pessoa.data_nascimento || "",
    observacoes: pessoa.observacoes || "",
  });
  const [salvando, setSalvando] = useState(false);

  const salvar = async () => {
    setSalvando(true);
    try {
      await pessoasAPI.editar(pessoa.id, form);
      toast.success("Registro atualizado!");
      onSalvo();
    } catch {
      toast.error("Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-verde-borda">
          <h3 className="font-bold text-verde-primario">Editar Registro</h3>
          <button onClick={onFechar} className="btn-ghost p-1"><XMarkIcon className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-xs text-texto-desabilitado font-mono">CPF: {pessoa.cpf}</p>
          <div>
            <label className="label">Nome</label>
            <input className="input" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Cidade</label>
              <input className="input" value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} />
            </div>
            <div>
              <label className="label">UF</label>
              <input className="input uppercase" maxLength={2} value={form.uf} onChange={(e) => setForm({ ...form, uf: e.target.value.toUpperCase() })} />
            </div>
          </div>
          <div>
            <label className="label">Data de Nascimento</label>
            <input className="input" type="date" value={form.data_nascimento} onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })} />
          </div>
          <div>
            <label className="label">Observações</label>
            <textarea className="input min-h-[80px] resize-y" value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} placeholder="Anotações sobre este CPF..." />
          </div>
        </div>
        <div className="flex justify-end gap-3 p-5 border-t border-verde-borda">
          <button className="btn-secundario" onClick={onFechar}>Cancelar</button>
          <button className="btn-primario" onClick={salvar} disabled={salvando}>
            {salvando ? "Salvando..." : <><CheckIcon className="w-4 h-4" /> Salvar</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal: Histórico + Notas ─────────────────────────────────────────────
function ModalHistorico({ pessoa, onFechar }) {
  const [historico, setHistorico] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    pessoasAPI.historico(pessoa.id)
      .then((r) => setHistorico(r.data))
      .finally(() => setCarregando(false));
  }, [pessoa.id]);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-verde-borda">
          <div>
            <h3 className="font-bold text-verde-primario">Histórico de Exportações</h3>
            <p className="text-xs text-texto-secundario font-mono">{pessoa.cpf}</p>
          </div>
          <button onClick={onFechar} className="btn-ghost p-1"><XMarkIcon className="w-5 h-5" /></button>
        </div>
        <div className="p-5">
          {pessoa.observacoes && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <p className="text-xs font-semibold text-amber-800 mb-1">Observações</p>
              <p className="text-sm text-texto-principal">{pessoa.observacoes}</p>
            </div>
          )}
          {carregando ? (
            <p className="text-center text-texto-desabilitado py-6">Carregando...</p>
          ) : historico.length === 0 ? (
            <p className="text-center text-texto-desabilitado py-6">Este CPF ainda não foi exportado.</p>
          ) : (
            <div className="space-y-2">
              {historico.map((h, i) => (
                <div key={i} className="flex items-start justify-between border border-verde-claro rounded-lg p-3">
                  <div>
                    <p className="text-sm font-medium text-texto-principal">{h.nome_lista}</p>
                    <p className="text-xs text-texto-secundario">{h.usuario} · {h.exportado_em}</p>
                  </div>
                  <span className="badge-info uppercase text-xs">{h.formato}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-end p-5 border-t border-verde-borda">
          <button className="btn-secundario" onClick={onFechar}>Fechar</button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal: Bloquear CPF ──────────────────────────────────────────────────
function ModalBloqueio({ pessoa, onConfirmar, onFechar, salvando }) {
  const desbloqueando = pessoa.bloqueado;
  const [motivo, setMotivo] = useState("");

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center gap-3 p-5 border-b border-orange-100">
          <LockClosedIcon className="w-6 h-6 text-orange-500 shrink-0" />
          <h3 className="font-bold text-orange-700">
            {desbloqueando ? "Desbloquear CPF" : "Bloquear CPF"}
          </h3>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-sm text-texto-principal">
            CPF: <span className="font-mono font-semibold">{pessoa.cpf}</span>
            {pessoa.nome && <span className="ml-1 text-texto-secundario">— {pessoa.nome}</span>}
          </p>
          {desbloqueando ? (
            <p className="text-sm text-texto-secundario">
              Este CPF ficará disponível para buscas e exportações novamente.
              {pessoa.motivo_bloqueio && <span className="block mt-1">Motivo anterior: <em>{pessoa.motivo_bloqueio}</em></span>}
            </p>
          ) : (
            <>
              <p className="text-sm text-texto-secundario">
                CPFs bloqueados ficam ocultos nas buscas e são excluídos de exportações.
              </p>
              <div>
                <label className="label">Motivo do bloqueio (opcional)</label>
                <input className="input" placeholder="Ex: Falecido, solicitou remoção..." value={motivo} onChange={(e) => setMotivo(e.target.value)} />
              </div>
            </>
          )}
        </div>
        <div className="flex justify-end gap-3 p-5 border-t border-orange-100">
          <button className="btn-secundario" onClick={onFechar} disabled={salvando}>Cancelar</button>
          <button
            className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-60"
            onClick={() => onConfirmar(!desbloqueando, motivo)}
            disabled={salvando}
          >
            {desbloqueando ? <LockOpenIcon className="w-4 h-4" /> : <LockClosedIcon className="w-4 h-4" />}
            {salvando ? "Salvando..." : desbloqueando ? "Desbloquear" : "Bloquear"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal: Edição em massa ────────────────────────────────────────────────
function ModalEditarMassa({ quantidade, onConfirmar, onFechar, salvando }) {
  const [campos, setCampos] = useState({ cidade: "", uf: "" });

  const temAlgo = campos.cidade.trim() || campos.uf.trim();

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center gap-3 p-5 border-b border-verde-borda">
          <PencilIcon className="w-6 h-6 text-verde-primario shrink-0" />
          <h3 className="font-bold text-verde-primario">Editar em Massa</h3>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-texto-secundario">
            Preencha apenas os campos que deseja alterar nos{" "}
            <strong>{quantidade} registros selecionados</strong>. Campos vazios serão ignorados.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Cidade</label>
              <input className="input" placeholder="Nova cidade" value={campos.cidade} onChange={(e) => setCampos({ ...campos, cidade: e.target.value })} />
            </div>
            <div>
              <label className="label">UF</label>
              <input className="input uppercase" maxLength={2} placeholder="BA" value={campos.uf} onChange={(e) => setCampos({ ...campos, uf: e.target.value.toUpperCase() })} />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 p-5 border-t border-verde-borda">
          <button className="btn-secundario" onClick={onFechar} disabled={salvando}>Cancelar</button>
          <button className="btn-primario" onClick={() => onConfirmar(campos)} disabled={salvando || !temAlgo}>
            {salvando ? "Salvando..." : <><CheckIcon className="w-4 h-4" /> Aplicar a {quantidade} registros</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal: Confirmar exclusão ─────────────────────────────────────────────
function ModalConfirmarExclusao({ quantidade, nomes, onConfirmar, onFechar, excluindo }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center gap-3 p-5 border-b border-red-100">
          <ExclamationTriangleIcon className="w-6 h-6 text-red-500 shrink-0" />
          <h3 className="font-bold text-red-600">Confirmar Exclusão</h3>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-sm text-texto-principal">
            Você está prestes a excluir{" "}
            <strong>{quantidade === 1 ? "1 registro" : `${quantidade} registros`}</strong>{" "}
            permanentemente. Esta ação não pode ser desfeita.
          </p>
          {nomes?.length > 0 && (
            <div className="bg-red-50 rounded-lg p-3 text-xs text-texto-secundario max-h-32 overflow-y-auto">
              {nomes.map((n, i) => <div key={i} className="truncate">{n}</div>)}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 p-5 border-t border-red-100">
          <button className="btn-secundario" onClick={onFechar} disabled={excluindo}>Cancelar</button>
          <button
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-60"
            onClick={onConfirmar}
            disabled={excluindo}
          >
            <TrashIcon className="w-4 h-4" />
            {excluindo ? "Excluindo..." : "Excluir definitivamente"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal: Busca em lote ──────────────────────────────────────────────────
function ModalBuscaLote({ onFechar }) {
  const [texto, setTexto] = useState("");
  const [resultado, setResultado] = useState(null);
  const [buscando, setBuscando] = useState(false);

  const buscar = async () => {
    const cpfs = texto.split(/[\n,;\s]+/).map((s) => s.trim()).filter(Boolean);
    if (!cpfs.length) { toast.error("Cole pelo menos um CPF."); return; }
    setBuscando(true);
    try {
      const res = await pessoasAPI.buscarLote(cpfs);
      setResultado(res.data);
    } catch {
      toast.error("Erro ao verificar lista.");
    } finally {
      setBuscando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-verde-borda shrink-0">
          <div>
            <h3 className="font-bold text-verde-primario">Verificar Lista de CPFs</h3>
            <p className="text-xs text-texto-secundario mt-0.5">Cole até 500 CPFs — um por linha, vírgula ou espaço</p>
          </div>
          <button onClick={onFechar} className="btn-ghost p-1"><XMarkIcon className="w-5 h-5" /></button>
        </div>

        {!resultado ? (
          <div className="p-5 flex flex-col gap-4 flex-1">
            <textarea
              className="input min-h-[200px] resize-none font-mono text-xs flex-1"
              placeholder={"000.000.000-00\n111.111.111-11\n22222222222"}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
            <div className="flex justify-end gap-3">
              <button className="btn-secundario" onClick={onFechar}>Cancelar</button>
              <button className="btn-primario" onClick={buscar} disabled={buscando || !texto.trim()}>
                {buscando ? "Verificando..." : <><MagnifyingGlassIcon className="w-4 h-4" /> Verificar</>}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-5 flex flex-col gap-4 flex-1 overflow-hidden">
            {/* Resumo */}
            <div className="grid grid-cols-3 gap-3 shrink-0">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-700">{resultado.encontrados}</p>
                <p className="text-xs text-green-700">Encontrados</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-red-600">{resultado.nao_encontrados}</p>
                <p className="text-xs text-red-600">Não encontrados</p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-gray-700">{resultado.total}</p>
                <p className="text-xs text-gray-600">Total verificado</p>
              </div>
            </div>

            {/* Tabela */}
            <div className="overflow-auto flex-1 border border-verde-borda rounded-lg">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="th">CPF</th>
                    <th className="th">Nome</th>
                    <th className="th">Convênio</th>
                    <th className="th">Cidade</th>
                    <th className="th">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.resultados.map((r, i) => (
                    <tr key={i} className={`tr ${!r.encontrado ? "opacity-60" : ""}`}>
                      <td className="td font-mono">{r.cpf}</td>
                      <td className="td">{r.nome || "—"}</td>
                      <td className="td">{r.convenio || "—"}</td>
                      <td className="td">{r.cidade ? `${r.cidade}/${r.uf}` : "—"}</td>
                      <td className="td">
                        {!r.encontrado ? (
                          <span className="badge-neutro">Não cadastrado</span>
                        ) : r.bloqueado ? (
                          <span className="badge-erro">Bloqueado</span>
                        ) : r.ja_exportado ? (
                          <span className="badge-aviso">Já exportado</span>
                        ) : (
                          <span className="badge-ok">Disponível</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3 shrink-0">
              <button className="btn-secundario" onClick={() => setResultado(null)}>← Nova busca</button>
              <button className="btn-secundario" onClick={onFechar}>Fechar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Página principal ──────────────────────────────────────────────────────
export default function Busca() {
  const { usuario } = useAuth();
  const podeEditar = ["administrador", "operador"].includes(usuario?.perfil);
  const isAdmin = usuario?.perfil === "administrador";
  const [convenios, setConvenios] = useState([]);
  const [regioes, setRegioes] = useState([]);
  const [filtros, setFiltros] = useState({
    nome: "", cpf: "", convenio_id: "", regiao_id: "",
    cidade: "", uf: "", idade_min: "", idade_max: "",
    cpf_valido: "", apenas_nao_exportados: false, apenas_exportados: false,
    incluir_bloqueados: false,
    page_size: 100, page: 1, ordem: "nome",
  });
  const [resultado, setResultado] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [pessoaEditar, setPessoaEditar] = useState(null);
  const [pessoaHistorico, setPessoaHistorico] = useState(null);
  const [pessoaBloqueio, setPessoaBloqueio] = useState(null);
  const [selecionados, setSelecionados] = useState(new Set());
  const [filtroAberto, setFiltroAberto] = useState(true);
  const [confirmarExclusao, setConfirmarExclusao] = useState(null);
  const [excluindo, setExcluindo] = useState(false);
  const [editarMassaAberto, setEditarMassaAberto] = useState(false);
  const [salvandoMassa, setSalvandoMassa] = useState(false);
  const [salvandoBloqueio, setSalvandoBloqueio] = useState(false);
  const [buscaLoteAberta, setBuscaLoteAberta] = useState(false);

  useEffect(() => {
    conveniosAPI.listar().then((r) => setConvenios(r.data));
  }, []);

  const atualizarConvenio = (id) => {
    setFiltros((f) => ({ ...f, convenio_id: id, regiao_id: "" }));
    if (id) {
      const conv = convenios.find((c) => String(c.id) === id);
      setRegioes(conv?.regioes || []);
    } else {
      setRegioes([]);
    }
  };

  const buscar = useCallback(async (paginaOverride) => {
    setCarregando(true);
    setSelecionados(new Set());
    try {
      const params = { ...filtros };
      if (paginaOverride) params.page = paginaOverride;
      if (!params.apenas_nao_exportados) delete params.apenas_nao_exportados;
      else params.apenas_nao_exportados = "true";
      if (!params.apenas_exportados) delete params.apenas_exportados;
      else params.apenas_exportados = "true";
      if (params.incluir_bloqueados) params.incluir_bloqueados = "true";
      else delete params.incluir_bloqueados;
      Object.keys(params).forEach((k) => {
        if (params[k] === "" || params[k] === false) delete params[k];
      });
      const res = await pessoasAPI.buscar(params);
      setResultado(res.data);
    } catch {
      toast.error("Erro ao realizar busca.");
    } finally {
      setCarregando(false);
    }
  }, [filtros]);

  const toggleSelecionado = (id) => {
    setSelecionados((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleTodos = () => {
    const ids = resultado?.resultados?.map((p) => p.id) || [];
    if (selecionados.size === ids.length) setSelecionados(new Set());
    else setSelecionados(new Set(ids));
  };

  const copiarCPFs = () => {
    const pessoas = resultado?.resultados?.filter((p) => selecionados.has(p.id));
    if (!pessoas?.length) { toast.error("Selecione pelo menos um registro."); return; }
    navigator.clipboard.writeText(pessoas.map((p) => p.cpf_raw || p.cpf).join("\n"));
    toast.success(`${pessoas.length} CPFs copiados!`);
  };

  const irParaExportacao = () => {
    sessionStorage.setItem("filtros_exportacao", JSON.stringify(filtros));
    window.location.href = "/exportacao";
  };

  const pedirExclusaoIndividual = (p) => {
    setConfirmarExclusao({ ids: [p.id], nomes: [p.nome ? `${p.nome} — ${p.cpf}` : p.cpf] });
  };

  const pedirExclusaoEmMassa = () => {
    const pessoas = resultado?.resultados?.filter((p) => selecionados.has(p.id)) || [];
    if (!pessoas.length) return;
    setConfirmarExclusao({
      ids: pessoas.map((p) => p.id),
      nomes: pessoas.map((p) => p.nome ? `${p.nome} — ${p.cpf}` : p.cpf),
    });
  };

  const confirmarEExcluir = async () => {
    if (!confirmarExclusao) return;
    setExcluindo(true);
    try {
      const res = await pessoasAPI.excluir(confirmarExclusao.ids);
      const total = res.data.excluidos;
      toast.success(`${total} registro${total !== 1 ? "s" : ""} excluído${total !== 1 ? "s" : ""}.`);
      setConfirmarExclusao(null);
      setSelecionados(new Set());
      buscar();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erro ao excluir.");
    } finally {
      setExcluindo(false);
    }
  };

  const confirmarEditarMassa = async (campos) => {
    const ids = [...selecionados];
    const camposValidos = Object.fromEntries(Object.entries(campos).filter(([, v]) => v.trim()));
    setSalvandoMassa(true);
    try {
      const res = await pessoasAPI.editarMassa(ids, camposValidos);
      toast.success(`${res.data.atualizados} registros atualizados!`);
      setEditarMassaAberto(false);
      setSelecionados(new Set());
      buscar();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erro na edição em massa.");
    } finally {
      setSalvandoMassa(false);
    }
  };

  const confirmarBloqueio = async (novoEstado, motivo) => {
    if (!pessoaBloqueio) return;
    setSalvandoBloqueio(true);
    try {
      await pessoasAPI.bloquear(pessoaBloqueio.id, { bloqueado: novoEstado, motivo });
      const acao = novoEstado ? "bloqueado" : "desbloqueado";
      toast.success(`CPF ${acao} com sucesso.`);
      setPessoaBloqueio(null);
      buscar();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erro ao bloquear CPF.");
    } finally {
      setSalvandoBloqueio(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-verde-primario">Busca Avançada</h1>
          <p className="text-sm text-texto-secundario mt-0.5">Pesquise e filtre CPFs por qualquer critério</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secundario py-1.5 text-xs" onClick={() => setBuscaLoteAberta(true)}>
            <ListBulletIcon className="w-4 h-4" />
            Verificar Lista
          </button>
          <button className="btn-ghost" onClick={() => setFiltroAberto((v) => !v)}>
            <FunnelIcon className="w-4 h-4" />
            {filtroAberto ? "Ocultar filtros" : "Mostrar filtros"}
          </button>
        </div>
      </div>

      {/* Painel de filtros */}
      {filtroAberto && (
        <div className="card">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="label">Nome</label>
              <input className="input" placeholder="Pesquisar por nome..." value={filtros.nome}
                onChange={(e) => setFiltros({ ...filtros, nome: e.target.value })} />
            </div>
            <div>
              <label className="label">CPF</label>
              <input className="input" placeholder="000.000.000-00" value={filtros.cpf}
                onChange={(e) => setFiltros({ ...filtros, cpf: e.target.value })} />
            </div>
            <div>
              <label className="label">Convênio</label>
              <select className="select" value={filtros.convenio_id} onChange={(e) => atualizarConvenio(e.target.value)}>
                <option value="">Todos</option>
                {convenios.map((c) => <option key={c.id} value={c.id}>{c.nome_convenio}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Região</label>
              <select className="select" value={filtros.regiao_id}
                onChange={(e) => setFiltros({ ...filtros, regiao_id: e.target.value })}
                disabled={!filtros.convenio_id}>
                <option value="">Todas</option>
                {regioes.map((r) => <option key={r.id} value={r.id}>{r.nome_regiao}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Cidade</label>
              <input className="input" placeholder="Ex: Salvador" value={filtros.cidade}
                onChange={(e) => setFiltros({ ...filtros, cidade: e.target.value })} />
            </div>
            <div>
              <label className="label">UF</label>
              <input className="input uppercase" maxLength={2} placeholder="BA" value={filtros.uf}
                onChange={(e) => setFiltros({ ...filtros, uf: e.target.value.toUpperCase() })} />
            </div>
            <div>
              <label className="label">Idade mínima</label>
              <input className="input" type="number" min={0} max={130} placeholder="35"
                value={filtros.idade_min} onChange={(e) => setFiltros({ ...filtros, idade_min: e.target.value })} />
            </div>
            <div>
              <label className="label">Idade máxima</label>
              <input className="input" type="number" min={0} max={130} placeholder="65"
                value={filtros.idade_max} onChange={(e) => setFiltros({ ...filtros, idade_max: e.target.value })} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 border-t border-verde-claro pt-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" className="rounded border-verde-borda"
                checked={filtros.apenas_nao_exportados}
                onChange={(e) => setFiltros({ ...filtros, apenas_nao_exportados: e.target.checked, apenas_exportados: false })} />
              <span>Apenas não exportados</span>
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" className="rounded border-verde-borda"
                checked={filtros.apenas_exportados}
                onChange={(e) => setFiltros({ ...filtros, apenas_exportados: e.target.checked, apenas_nao_exportados: false })} />
              <span>Apenas já exportados</span>
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" className="rounded border-verde-borda"
                checked={filtros.incluir_bloqueados}
                onChange={(e) => setFiltros({ ...filtros, incluir_bloqueados: e.target.checked })} />
              <span className="text-orange-700">Incluir bloqueados</span>
            </label>
            <div className="flex items-center gap-2 ml-auto">
              <label className="label mb-0">Por página:</label>
              <select className="select w-24" value={filtros.page_size}
                onChange={(e) => setFiltros({ ...filtros, page_size: Number(e.target.value) })}>
                {[50, 100, 250, 500, 1000].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <button className="btn-primario" onClick={() => buscar(1)}>
                <MagnifyingGlassIcon className="w-4 h-4" /> Buscar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resultados */}
      {resultado && (
        <div className="card p-0 overflow-hidden">
          {/* Barra de ações */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-verde-claro bg-verde-fundo">
            <div className="text-sm text-texto-secundario">
              <span className="font-bold text-verde-primario">{resultado.total?.toLocaleString("pt-BR")}</span>{" "}
              registros encontrados
              {selecionados.size > 0 && <span className="ml-2 badge-info">{selecionados.size} selecionados</span>}
            </div>
            <div className="flex gap-2">
              {selecionados.size > 0 && (
                <>
                  <button className="btn-secundario py-1.5 text-xs" onClick={copiarCPFs}>
                    📋 Copiar CPFs
                  </button>
                  {podeEditar && (
                    <button className="btn-secundario py-1.5 text-xs" onClick={() => setEditarMassaAberto(true)}>
                      <PencilIcon className="w-3.5 h-3.5" /> Editar em massa
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      className="py-1.5 px-3 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold flex items-center gap-1.5 border border-red-200 transition-colors"
                      onClick={pedirExclusaoEmMassa}
                    >
                      <TrashIcon className="w-3.5 h-3.5" /> Excluir ({selecionados.size})
                    </button>
                  )}
                </>
              )}
              <button className="btn-primario py-1.5 text-xs" onClick={irParaExportacao}>
                <ArrowDownTrayIcon className="w-4 h-4" /> Exportar com estes filtros
              </button>
            </div>
          </div>

          {/* Tabela */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th w-10">
                    <input type="checkbox" onChange={toggleTodos}
                      checked={selecionados.size > 0 && selecionados.size === resultado.resultados.length} />
                  </th>
                  <th className="th">Nome</th>
                  <th className="th">CPF</th>
                  <th className="th text-right">Idade</th>
                  <th className="th">Cidade</th>
                  <th className="th">UF</th>
                  <th className="th">Convênio</th>
                  <th className="th">Região</th>
                  <th className="th">Status</th>
                  <th className="th w-24"></th>
                </tr>
              </thead>
              <tbody>
                {carregando ? (
                  <tr><td colSpan={10} className="td text-center py-12 text-texto-desabilitado">Buscando...</td></tr>
                ) : resultado.resultados.length === 0 ? (
                  <tr><td colSpan={10} className="td text-center py-12 text-texto-desabilitado">Nenhum registro encontrado com esses filtros.</td></tr>
                ) : (
                  resultado.resultados.map((p) => (
                    <tr key={p.id} className={`tr ${selecionados.has(p.id) ? "bg-verde-claro" : ""} ${p.bloqueado ? "opacity-60" : ""}`}>
                      <td className="td w-10">
                        <input type="checkbox" checked={selecionados.has(p.id)} onChange={() => toggleSelecionado(p.id)} />
                      </td>
                      <td className="td font-medium max-w-[180px] truncate">
                        {p.nome || "—"}
                        {p.observacoes && <span className="ml-1 text-amber-500" title={p.observacoes}>●</span>}
                      </td>
                      <td className="td font-mono text-xs">{p.cpf}</td>
                      <td className="td text-right">{p.idade ?? "—"}</td>
                      <td className="td">{p.cidade || "—"}</td>
                      <td className="td">{p.uf || "—"}</td>
                      <td className="td text-xs">{p.convenio || "—"}</td>
                      <td className="td text-xs">{p.regiao || "—"}</td>
                      <td className="td">
                        {p.bloqueado ? (
                          <span className="badge-erro">Bloqueado</span>
                        ) : p.ja_exportado ? (
                          <span className="badge-aviso">Exportado</span>
                        ) : (
                          <span className="badge-ok">Disponível</span>
                        )}
                      </td>
                      <td className="td">
                        <div className="flex items-center gap-0.5">
                          <button className="btn-ghost p-1 text-texto-desabilitado hover:text-verde-primario"
                            onClick={() => setPessoaHistorico(p)} title="Histórico de exportações">
                            <ChatBubbleBottomCenterTextIcon className="w-4 h-4" />
                          </button>
                          {podeEditar && (
                            <button className="btn-ghost p-1 text-texto-desabilitado hover:text-verde-primario"
                              onClick={() => setPessoaEditar(p)} title="Editar registro">
                              <PencilSquareIcon className="w-4 h-4" />
                            </button>
                          )}
                          {isAdmin && (
                            <button className="btn-ghost p-1 text-texto-desabilitado hover:text-orange-500"
                              onClick={() => setPessoaBloqueio(p)}
                              title={p.bloqueado ? "Desbloquear CPF" : "Bloquear CPF"}>
                              {p.bloqueado ? <LockOpenIcon className="w-4 h-4" /> : <LockClosedIcon className="w-4 h-4" />}
                            </button>
                          )}
                          {isAdmin && (
                            <button className="btn-ghost p-1 text-texto-desabilitado hover:text-red-600"
                              onClick={() => pedirExclusaoIndividual(p)} title="Excluir registro">
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {(resultado.next || resultado.previous) && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-verde-claro">
              <button className="btn-secundario py-1.5 text-xs" disabled={!resultado.previous}
                onClick={() => buscar(filtros.page - 1)}>← Anterior</button>
              <span className="text-sm text-texto-secundario">Página {filtros.page}</span>
              <button className="btn-secundario py-1.5 text-xs" disabled={!resultado.next}
                onClick={() => { setFiltros((f) => ({ ...f, page: f.page + 1 })); buscar(filtros.page + 1); }}>
                Próxima →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modais */}
      {pessoaEditar && (
        <ModalEditar pessoa={pessoaEditar} onFechar={() => setPessoaEditar(null)} onSalvo={() => { setPessoaEditar(null); buscar(); }} />
      )}
      {pessoaHistorico && (
        <ModalHistorico pessoa={pessoaHistorico} onFechar={() => setPessoaHistorico(null)} />
      )}
      {pessoaBloqueio && (
        <ModalBloqueio pessoa={pessoaBloqueio} onConfirmar={confirmarBloqueio}
          onFechar={() => !salvandoBloqueio && setPessoaBloqueio(null)} salvando={salvandoBloqueio} />
      )}
      {editarMassaAberto && (
        <ModalEditarMassa quantidade={selecionados.size} onConfirmar={confirmarEditarMassa}
          onFechar={() => !salvandoMassa && setEditarMassaAberto(false)} salvando={salvandoMassa} />
      )}
      {confirmarExclusao && (
        <ModalConfirmarExclusao quantidade={confirmarExclusao.ids.length} nomes={confirmarExclusao.nomes}
          onConfirmar={confirmarEExcluir} onFechar={() => !excluindo && setConfirmarExclusao(null)} excluindo={excluindo} />
      )}
      {buscaLoteAberta && (
        <ModalBuscaLote onFechar={() => setBuscaLoteAberta(false)} />
      )}
    </div>
  );
}

