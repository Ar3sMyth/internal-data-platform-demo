import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { authAPI, conveniosAPI, downloadBlob } from "../services/api";
import toast from "react-hot-toast";
import {
  PlusIcon, TrashIcon, PencilIcon, CheckIcon, XMarkIcon,
  ArrowDownTrayIcon, UserPlusIcon, ShieldCheckIcon,
} from "@heroicons/react/24/outline";

// ─── Convênios e Regiões ──────────────────────────────────────────────────────
function SectionConvenios() {
  const [convenios, setConvenios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [novoConvenio, setNovoConvenio] = useState("");
  const [criando, setCriando] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [editandoNome, setEditandoNome] = useState("");
  const [novaRegiao, setNovaRegiao] = useState({});
  const [criandoRegiao, setCriandoRegiao] = useState({});
  const [expandido, setExpandido] = useState({});

  async function carregar() {
    try {
      const r = await conveniosAPI.listar();
      setConvenios(r.data);
    } catch {
      toast.error("Erro ao carregar convênios.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { carregar(); }, []);

  async function criarConvenio(e) {
    e.preventDefault();
    if (!novoConvenio.trim()) return;
    setCriando(true);
    try {
      await conveniosAPI.criarConvenio({ nome_convenio: novoConvenio.trim() });
      toast.success("Convênio criado!");
      setNovoConvenio("");
      carregar();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erro ao criar convênio.");
    } finally {
      setCriando(false);
    }
  }

  async function salvarEdicao(id) {
    if (!editandoNome.trim()) return;
    try {
      await conveniosAPI.editarConvenio(id, { nome_convenio: editandoNome.trim() });
      toast.success("Convênio atualizado!");
      setEditandoId(null);
      carregar();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erro ao editar convênio.");
    }
  }

  async function excluirConvenio(id, nome) {
    if (!window.confirm(`Desativar convênio "${nome}"? Os CPFs vinculados não serão apagados.`)) return;
    try {
      await conveniosAPI.excluirConvenio(id);
      toast.success("Convênio desativado.");
      carregar();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erro ao excluir convênio.");
    }
  }

  async function criarRegiao(e, convenioId) {
    e.preventDefault();
    const nome = novaRegiao[convenioId]?.trim();
    if (!nome) return;
    setCriandoRegiao((p) => ({ ...p, [convenioId]: true }));
    try {
      await conveniosAPI.criarRegiao(convenioId, { nome_regiao: nome });
      toast.success("Região criada!");
      setNovaRegiao((p) => ({ ...p, [convenioId]: "" }));
      carregar();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erro ao criar região.");
    } finally {
      setCriandoRegiao((p) => ({ ...p, [convenioId]: false }));
    }
  }

  async function excluirRegiao(convenioId, regiaoId, nome) {
    if (!window.confirm(`Remover região "${nome}"?`)) return;
    try {
      await conveniosAPI.excluirRegiao(convenioId, regiaoId);
      toast.success("Região removida.");
      carregar();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erro ao remover região.");
    }
  }

  if (carregando) return <div className="card text-sm text-texto-secundario">Carregando convênios…</div>;

  return (
    <div className="card">
      <h2 className="section-title mb-4">Convênios e Regiões</h2>

      {/* Form novo convênio */}
      <form onSubmit={criarConvenio} className="flex gap-2 mb-5">
        <input
          className="input flex-1"
          placeholder="Nome do novo convênio…"
          value={novoConvenio}
          onChange={(e) => setNovoConvenio(e.target.value)}
        />
        <button className="btn-primary flex items-center gap-1.5" disabled={criando}>
          <PlusIcon className="w-4 h-4" />
          {criando ? "Criando…" : "Adicionar"}
        </button>
      </form>

      {convenios.length === 0 ? (
        <p className="text-sm text-texto-desabilitado text-center py-6">Nenhum convênio cadastrado.</p>
      ) : (
        <div className="space-y-3">
          {convenios.map((c) => (
            <div key={c.id} className="border border-verde-borda rounded-lg overflow-hidden">
              {/* Cabeçalho do convênio */}
              <div className="flex items-center gap-2 px-3 py-2 bg-verde-claro">
                {editandoId === c.id ? (
                  <>
                    <input
                      className="input flex-1 py-1 text-sm"
                      value={editandoNome}
                      onChange={(e) => setEditandoNome(e.target.value)}
                      autoFocus
                    />
                    <button
                      onClick={() => salvarEdicao(c.id)}
                      className="p-1 text-green-600 hover:text-green-800"
                      title="Salvar"
                    >
                      <CheckIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditandoId(null)}
                      className="p-1 text-gray-500 hover:text-gray-700"
                      title="Cancelar"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setExpandido((p) => ({ ...p, [c.id]: !p[c.id] }))}
                      className="flex-1 text-left text-sm font-semibold text-verde-primario"
                    >
                      {c.nome_convenio}
                      <span className="ml-2 text-xs font-normal text-texto-secundario">
                        ({c.regioes?.length ?? 0} regiões)
                      </span>
                    </button>
                    <button
                      onClick={() => { setEditandoId(c.id); setEditandoNome(c.nome_convenio); }}
                      className="p-1 text-texto-secundario hover:text-verde-primario"
                      title="Editar nome"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => excluirConvenio(c.id, c.nome_convenio)}
                      className="p-1 text-texto-secundario hover:text-red-600"
                      title="Desativar convênio"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>

              {/* Regiões */}
              {expandido[c.id] && (
                <div className="px-3 py-3 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {(c.regioes ?? []).map((r) => (
                      <span key={r.id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-verde-borda rounded-full text-xs font-medium text-verde-primario">
                        {r.nome_regiao}
                        <button
                          onClick={() => excluirRegiao(c.id, r.id, r.nome_regiao)}
                          className="ml-0.5 text-texto-secundario hover:text-red-500"
                          title="Remover região"
                        >
                          <XMarkIcon className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    {(c.regioes ?? []).length === 0 && (
                      <span className="text-xs text-texto-desabilitado">Nenhuma região cadastrada.</span>
                    )}
                  </div>

                  {/* Form nova região */}
                  <form onSubmit={(e) => criarRegiao(e, c.id)} className="flex gap-2 mt-2">
                    <input
                      className="input flex-1 text-sm py-1"
                      placeholder="Nova região…"
                      value={novaRegiao[c.id] ?? ""}
                      onChange={(e) => setNovaRegiao((p) => ({ ...p, [c.id]: e.target.value }))}
                    />
                    <button className="btn-secundario py-1 px-3 text-sm" disabled={criandoRegiao[c.id]}>
                      <PlusIcon className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Backup ───────────────────────────────────────────────────────────────────
function SectionBackup() {
  const [baixando, setBaixando] = useState(false);

  async function baixar() {
    setBaixando(true);
    try {
      const r = await authAPI.backup();
      const data = new Date().toISOString().slice(0, 10);
      downloadBlob(r.data, `backup_demo_${data}.sqlite3`);
      toast.success("Backup baixado!");
    } catch {
      toast.error("Erro ao gerar backup.");
    } finally {
      setBaixando(false);
    }
  }

  return (
    <div className="card max-w-md">
      <h2 className="section-title mb-2">Backup do Data Platform</h2>
      <p className="text-sm text-texto-secundario mb-4">
        Gera um arquivo <strong>.sqlite3</strong> com todos os dados do sistema. Guarde-o em local seguro.
      </p>
      <button className="btn-primary flex items-center gap-2" onClick={baixar} disabled={baixando}>
        <ArrowDownTrayIcon className="w-5 h-5" />
        {baixando ? "Gerando…" : "Baixar Backup"}
      </button>
    </div>
  );
}

// ─── Gestão de Usuários ───────────────────────────────────────────────────────
function SectionUsuarios({ usuarioAtual }) {
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [criandoAberto, setCriandoAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [novoUser, setNovoUser] = useState({ nome: "", email: "", senha: "", perfil: "operador" }); // "operador" já está correto

  async function carregar() {
    try {
      const r = await authAPI.listarUsuarios();
      setUsuarios(r.data);
    } catch {
      toast.error("Erro ao carregar usuários.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { carregar(); }, []);

  function handleNovo(e) { setNovoUser((p) => ({ ...p, [e.target.name]: e.target.value })); }

  async function criarUsuario(e) {
    e.preventDefault();
    setSalvando(true);
    try {
      await authAPI.criarUsuario(novoUser);
      toast.success("Usuário criado!");
      setNovoUser({ nome: "", email: "", senha: "", perfil: "operador" });
      setCriandoAberto(false);
      carregar();
    } catch (err) {
      const erros = err.response?.data;
      const msg = typeof erros === "object" ? Object.values(erros).flat().join(" ") : "Erro ao criar usuário.";
      toast.error(msg);
    } finally {
      setSalvando(false);
    }
  }

  async function alterarPerfil(id, perfil) {
    try {
      await authAPI.atualizarUsuario(id, { perfil });
      toast.success("Perfil atualizado.");
      carregar();
    } catch {
      toast.error("Erro ao alterar perfil.");
    }
  }

  async function toggleAtivo(id, ativo, nome) {
    const acao = ativo ? "desativar" : "ativar";
    if (!window.confirm(`Deseja ${acao} o usuário "${nome}"?`)) return;
    try {
      await authAPI.atualizarUsuario(id, { ativo: !ativo });
      toast.success(`Usuário ${ativo ? "desativado" : "ativado"}.`);
      carregar();
    } catch {
      toast.error("Erro ao alterar usuário.");
    }
  }

  async function excluirUsuario(id, nome) {
    if (id === usuarioAtual?.id) { toast.error("Você não pode excluir sua própria conta."); return; }
    if (!window.confirm(`Excluir permanentemente o usuário "${nome}"? Essa ação não pode ser desfeita.`)) return;
    try {
      await authAPI.excluirUsuario(id);
      toast.success("Usuário excluído.");
      carregar();
    } catch {
      toast.error("Erro ao excluir usuário.");
    }
  }

  if (carregando) return <div className="card text-sm text-texto-secundario">Carregando usuários…</div>;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Gestão de Usuários</h2>
        <button
          className="btn-primary flex items-center gap-1.5"
          onClick={() => setCriandoAberto((p) => !p)}
        >
          <UserPlusIcon className="w-4 h-4" />
          Novo Usuário
        </button>
      </div>

      {/* Form criar usuário */}
      {criandoAberto && (
        <form onSubmit={criarUsuario} className="grid grid-cols-2 gap-3 mb-5 p-4 bg-verde-claro rounded-lg border border-verde-borda">
          <div>
            <label className="label">Nome</label>
            <input className="input" name="nome" value={novoUser.nome} onChange={handleNovo} required placeholder="Nome completo" />
          </div>
          <div>
            <label className="label">E-mail</label>
            <input className="input" name="email" type="email" value={novoUser.email} onChange={handleNovo} required placeholder="email@exemplo.com" />
          </div>
          <div>
            <label className="label">Senha inicial</label>
            <input className="input" name="senha" type="password" value={novoUser.senha} onChange={handleNovo} required minLength={6} placeholder="Mín. 6 caracteres" />
          </div>
          <div>
            <label className="label">Perfil</label>
            <select className="input" name="perfil" value={novoUser.perfil} onChange={handleNovo}>
              <option value="administrador">Administrador</option>
              <option value="operador">Operador</option>
              <option value="visualizador">Visualizador</option>
            </select>
          </div>
          <div className="col-span-2 flex gap-2 justify-end">
            <button type="button" className="btn-secundario" onClick={() => setCriandoAberto(false)}>Cancelar</button>
            <button className="btn-primary" disabled={salvando}>{salvando ? "Criando…" : "Criar Usuário"}</button>
          </div>
        </form>
      )}

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th rounded-tl-lg">Nome</th>
              <th className="th">E-mail</th>
              <th className="th">Perfil</th>
              <th className="th">Status</th>
              <th className="th rounded-tr-lg">Ações</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => {
              const ehEuMesmo = u.id === usuarioAtual?.id;
              return (
                <tr key={u.id} className={`tr ${!u.ativo ? "opacity-50" : ""}`}>
                  <td className="td font-medium">
                    {u.nome}
                    {ehEuMesmo && (
                      <span className="ml-2 text-xs bg-verde-claro text-verde-primario px-1.5 py-0.5 rounded-full font-semibold">
                        Você
                      </span>
                    )}
                  </td>
                  <td className="td text-texto-secundario text-sm">{u.email}</td>
                  <td className="td">
                    {ehEuMesmo ? (
                      <span className="badge-ok capitalize">{u.perfil}</span>
                    ) : (
                      <select
                        className="text-xs border border-verde-borda rounded px-1.5 py-0.5 bg-white text-texto-principal focus:outline-none focus:ring-1 focus:ring-verde-primario"
                        value={u.perfil}
                        onChange={(e) => alterarPerfil(u.id, e.target.value)}
                      >
                        <option value="administrador">Administrador</option>
                        <option value="operador">Operador</option>
                        <option value="visualizador">Visualizador</option>
                      </select>
                    )}
                  </td>
                  <td className="td">
                    {u.ativo
                      ? <span className="badge-ok">Ativo</span>
                      : <span className="badge-erro">Inativo</span>
                    }
                  </td>
                  <td className="td">
                    <div className="flex items-center gap-1">
                      {!ehEuMesmo && (
                        <button
                          onClick={() => toggleAtivo(u.id, u.ativo, u.nome)}
                          className={`p-1.5 rounded hover:bg-gray-100 ${u.ativo ? "text-yellow-600" : "text-green-600"}`}
                          title={u.ativo ? "Desativar" : "Ativar"}
                        >
                          <ShieldCheckIcon className="w-4 h-4" />
                        </button>
                      )}
                      {!ehEuMesmo && (
                        <button
                          onClick={() => excluirUsuario(u.id, u.nome)}
                          className="p-1.5 rounded hover:bg-red-50 text-red-500"
                          title="Excluir usuário"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                      {ehEuMesmo && <span className="text-xs text-texto-desabilitado">—</span>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function Configuracoes() {
  const { usuario } = useAuth();
  const isAdmin = usuario?.perfil === "administrador";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-verde-primario">Configurações</h1>
        <p className="text-sm text-texto-secundario mt-0.5">
          Gerencie convênios, usuários e backups do sistema.
        </p>
      </div>

      {isAdmin && (
        <>
          <SectionConvenios />
          <SectionBackup />
          <SectionUsuarios usuarioAtual={usuario} />
        </>
      )}
    </div>
  );
}

