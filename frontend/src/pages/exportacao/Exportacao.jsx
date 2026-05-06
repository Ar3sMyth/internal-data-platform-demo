import { useState, useEffect } from "react";
import { exportacaoAPI, conveniosAPI } from "../../services/api";
import { downloadBlob } from "../../services/api";
import toast from "react-hot-toast";
import {
  ArrowDownTrayIcon, ClipboardDocumentIcon, ExclamationTriangleIcon,
  CheckCircleIcon, ClockIcon, BookmarkIcon, TrashIcon, BookmarkSlashIcon,
} from "@heroicons/react/24/outline";

function NomeAutomatico({ filtros, convenios }) {
  const conv = convenios.find((c) => String(c.id) === String(filtros.convenio_id));
  const reg = conv?.regioes?.find((r) => String(r.id) === String(filtros.regiao_id));

  const partes = [];
  if (conv) partes.push(conv.nome_convenio);
  if (reg) partes.push(reg.nome_regiao);
  if (filtros.cidade) partes.push(filtros.cidade);
  if (filtros.idade_min || filtros.idade_max) {
    const min = filtros.idade_min || "0";
    const max = filtros.idade_max || "99";
    partes.push(`${min} a ${max} anos`);
  }
  if (filtros.apenas_nao_exportados) partes.push("Não exportados");
  if (filtros.limite) partes.push(`${filtros.limite} CPFs`);

  return partes.join(" — ") || "Nova Exportação";
}

export default function Exportacao() {
  const [convenios, setConvenios] = useState([]);
  const [regioes, setRegioes] = useState([]);
  const [totalDisponivel, setTotalDisponivel] = useState(null);
  const [filtros, setFiltros] = useState(() => {
    // Recupera filtros da busca, se existirem
    try {
      const saved = sessionStorage.getItem("filtros_exportacao");
      if (saved) {
        sessionStorage.removeItem("filtros_exportacao");
        return JSON.parse(saved);
      }
    } catch {}
    return {
      convenio_id: "", regiao_id: "", cidade: "", uf: "",
      idade_min: "", idade_max: "", apenas_nao_exportados: true,
    };
  });
  const [opcoes, setOpcoes] = useState({
    formato: "txt",
    com_pontuacao: false,
    limite: 500,
    marcar_usados: true,
  });
  const [nomeManual, setNomeManual] = useState("");
  const [exportando, setExportando] = useState(false);
  const [historico, setHistorico] = useState([]);
  const [clipboardCPFs, setClipboardCPFs] = useState(null);
  const [confirmacao, setConfirmacao] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [salvandoTemplate, setSalvandoTemplate] = useState(false);
  const [nomeTemplate, setNomeTemplate] = useState("");
  const [templateAberto, setTemplateAberto] = useState(false);

  const recarregarTemplates = () => exportacaoAPI.listarTemplates().then((r) => setTemplates(r.data));

  useEffect(() => {
    conveniosAPI.listar().then((r) => setConvenios(r.data));
    exportacaoAPI.historico().then((r) => setHistorico(r.data));
    recarregarTemplates();
  }, []);

  useEffect(() => {
    const params = {};
    if (filtros.convenio_id) params.convenio_id = filtros.convenio_id;
    if (filtros.regiao_id) params.regiao_id = filtros.regiao_id;
    if (filtros.cidade) params.cidade = filtros.cidade;
    if (filtros.uf) params.uf = filtros.uf;
    if (filtros.idade_min) params.idade_min = filtros.idade_min;
    if (filtros.idade_max) params.idade_max = filtros.idade_max;
    if (filtros.apenas_nao_exportados) params.apenas_nao_exportados = "true";

    exportacaoAPI.previsualizar(params)
      .then((r) => setTotalDisponivel(r.data.total_disponivel))
      .catch(() => setTotalDisponivel(null));
  }, [filtros]);

  const atualizarConvenio = (id) => {
    setFiltros((f) => ({ ...f, convenio_id: id, regiao_id: "" }));
    const conv = convenios.find((c) => String(c.id) === id);
    setRegioes(conv?.regioes || []);
  };

  const salvarTemplate = async () => {
    const nome = nomeTemplate.trim() || nomeLista;
    if (!nome) { toast.error("Defina um nome para o template."); return; }
    setSalvandoTemplate(true);
    try {
      await exportacaoAPI.criarTemplate({
        nome,
        filtros,
        formato: opcoes.formato,
        com_pontuacao: opcoes.com_pontuacao,
        limite: opcoes.limite,
      });
      toast.success(`Template "${nome}" salvo!`);
      setNomeTemplate("");
      setTemplateAberto(false);
      recarregarTemplates();
    } catch {
      toast.error("Erro ao salvar template.");
    } finally {
      setSalvandoTemplate(false);
    }
  };

  const carregarTemplate = (t) => {
    const conv = convenios.find((c) => String(c.id) === String(t.filtros.convenio_id));
    setFiltros({ ...filtros, ...t.filtros });
    setOpcoes({ formato: t.formato, com_pontuacao: t.com_pontuacao, limite: t.limite, marcar_usados: opcoes.marcar_usados });
    if (conv) setRegioes(conv.regioes || []);
    toast.success(`Template "${t.nome}" carregado!`);
  };

  const excluirTemplate = async (id, nome) => {
    try {
      await exportacaoAPI.excluirTemplate(id);
      toast.success(`Template "${nome}" excluído.`);
      recarregarTemplates();
    } catch {
      toast.error("Erro ao excluir template.");
    }
  };

  const nomeLista = nomeManual || NomeAutomatico({ filtros, convenios });

  const exportar = async () => {
    if (opcoes.limite > 1000 && !confirmacao) {
      setConfirmacao(true);
      return;
    }
    setConfirmacao(false);
    setExportando(true);
    setClipboardCPFs(null);

    const payload = {
      filtros: {
        ...filtros,
        limite: opcoes.limite,
        apenas_nao_exportados: filtros.apenas_nao_exportados || false,
      },
      formato: opcoes.formato,
      com_pontuacao: opcoes.com_pontuacao,
      nome_lista: nomeLista,
      marcar_usados: opcoes.marcar_usados,
      limite: opcoes.limite,
    };

    try {
      if (opcoes.formato === "clipboard") {
        const res = await exportacaoAPI.exportarClipboard(payload);
        const cpfs = res.data.cpfs;
        await navigator.clipboard.writeText(cpfs.join("\n"));
        setClipboardCPFs(cpfs);
        toast.success(`${cpfs.length} CPFs copiados para a área de transferência!`);
        if (res.data.aviso_ja_exportados > 0) {
          toast(`${res.data.aviso_ja_exportados} CPFs já haviam sido exportados anteriormente.`, { icon: "⚠️" });
        }
      } else {
        const res = await exportacaoAPI.exportar(payload);
        const blob = new Blob([res.data], { type: res.headers["content-type"] });
        const ext = opcoes.formato;
        downloadBlob(blob, `${nomeLista.replace(/ /g, "_")}.${ext}`);
        toast.success(`Arquivo ${ext.toUpperCase()} gerado com sucesso!`);
        const avisoHeader = res.headers["x-aviso-exportados"];
        if (avisoHeader && Number(avisoHeader) > 0) {
          toast(`${avisoHeader} CPFs desta lista já haviam sido exportados antes.`, { icon: "⚠️" });
        }
      }
      // Recarrega histórico
      exportacaoAPI.historico().then((r) => setHistorico(r.data));
    } catch (err) {
      const msg = err.response?.data?.detail || "Erro ao exportar.";
      toast.error(msg);
    } finally {
      setExportando(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-xl font-bold text-verde-primario">Exportar CPFs</h1>
        <p className="text-sm text-texto-secundario mt-0.5">
          Prepare listas de CPFs para uso no simulador ou higienizador
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel de filtros e opções */}
        <div className="lg:col-span-2 space-y-5">
          {/* Filtros */}
          <div className="card">
            <h2 className="text-sm font-bold text-verde-primario mb-4 uppercase tracking-wide">
              Filtros de seleção
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Convênio</label>
                <select className="select" value={filtros.convenio_id}
                  onChange={(e) => atualizarConvenio(e.target.value)}>
                  <option value="">Todos os convênios</option>
                  {convenios.map((c) => <option key={c.id} value={c.id}>{c.nome_convenio}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Região</label>
                <select className="select" value={filtros.regiao_id}
                  onChange={(e) => setFiltros({ ...filtros, regiao_id: e.target.value })}
                  disabled={!filtros.convenio_id}>
                  <option value="">Todas as regiões</option>
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
                <input className="input" type="number" placeholder="35" value={filtros.idade_min}
                  onChange={(e) => setFiltros({ ...filtros, idade_min: e.target.value })} />
              </div>
              <div>
                <label className="label">Idade máxima</label>
                <input className="input" type="number" placeholder="65" value={filtros.idade_max}
                  onChange={(e) => setFiltros({ ...filtros, idade_max: e.target.value })} />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-verde-claro">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" className="rounded"
                  checked={filtros.apenas_nao_exportados}
                  onChange={(e) => setFiltros({ ...filtros, apenas_nao_exportados: e.target.checked })} />
                <span className="font-medium text-texto-principal">
                  Apenas CPFs ainda não exportados
                </span>
              </label>
            </div>
          </div>

          {/* Opções de exportação */}
          <div className="card">
            <h2 className="text-sm font-bold text-verde-primario mb-4 uppercase tracking-wide">
              Opções de exportação
            </h2>
            <div className="space-y-4">
              {/* Formato */}
              <div>
                <label className="label">Formato do arquivo</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { value: "txt", label: "TXT", desc: "Um CPF por linha" },
                    { value: "csv", label: "CSV", desc: "Separado por vírgula" },
                    { value: "xlsx", label: "XLSX", desc: "Planilha Excel" },
                    { value: "clipboard", label: "📋 Copiar", desc: "Área de transferência" },
                  ].map((f) => (
                    <label key={f.value}
                      className={`border-2 rounded-lg p-3 cursor-pointer text-center transition-colors
                        ${opcoes.formato === f.value
                          ? "border-verde-primario bg-verde-claro"
                          : "border-verde-borda hover:border-verde-secundario"}`}
                    >
                      <input type="radio" className="sr-only" value={f.value}
                        checked={opcoes.formato === f.value}
                        onChange={() => setOpcoes({ ...opcoes, formato: f.value })} />
                      <p className="font-bold text-sm text-texto-principal">{f.label}</p>
                      <p className="text-xs text-texto-desabilitado mt-0.5">{f.desc}</p>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Limite */}
                <div>
                  <label className="label">Quantidade de CPFs</label>
                  <input className="input" type="number" min={1} max={50000}
                    value={opcoes.limite}
                    onChange={(e) => setOpcoes({ ...opcoes, limite: Number(e.target.value) })} />
                  {totalDisponivel !== null && (
                    <p className="text-xs text-texto-secundario mt-1">
                      <ClockIcon className="w-3 h-3 inline mr-1" />
                      {totalDisponivel.toLocaleString("pt-BR")} disponíveis com esses filtros
                    </p>
                  )}
                </div>

                {/* Pontuação */}
                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 text-sm cursor-pointer mb-2">
                    <input type="checkbox" className="rounded"
                      checked={opcoes.com_pontuacao}
                      onChange={(e) => setOpcoes({ ...opcoes, com_pontuacao: e.target.checked })} />
                    <span className="text-texto-principal font-medium">CPF com pontuação</span>
                  </label>
                  <p className="text-xs text-texto-desabilitado">
                    {opcoes.com_pontuacao ? "000.000.000-00" : "00000000000"}
                  </p>
                </div>
              </div>

              {/* Marcar usados */}
              <div className="border-t border-verde-claro pt-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" className="rounded"
                    checked={opcoes.marcar_usados}
                    onChange={(e) => setOpcoes({ ...opcoes, marcar_usados: e.target.checked })} />
                  <span className="font-medium text-texto-principal">
                    Marcar CPFs como "já exportados"
                  </span>
                </label>
                <p className="text-xs text-texto-desabilitado ml-5 mt-0.5">
                  Impede que esses CPFs apareçam em futuras exportações de "não exportados"
                </p>
              </div>
            </div>
          </div>

          {/* Nome da lista */}
          <div className="card">
            <label className="label">Nome da lista</label>
            <input className="input" placeholder={nomeLista}
              value={nomeManual}
              onChange={(e) => setNomeManual(e.target.value)} />
            {!nomeManual && (
              <p className="text-xs text-texto-secundario mt-1">
                ⚡ Nome automático: <strong>{nomeLista}</strong>
              </p>
            )}
          </div>
        </div>

        {/* Painel lateral — Resumo e ação */}
        <div className="space-y-4">
          <div className="card border-2 border-verde-borda sticky top-0">
            <h2 className="text-sm font-bold text-verde-primario mb-4">Resumo da exportação</h2>

            <div className="space-y-3 mb-5">
              <div className="flex justify-between text-sm">
                <span className="text-texto-secundario">Disponíveis</span>
                <span className="font-bold text-verde-primario">
                  {totalDisponivel?.toLocaleString("pt-BR") ?? "—"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-texto-secundario">Limite definido</span>
                <span className="font-bold">{opcoes.limite.toLocaleString("pt-BR")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-texto-secundario">Serão exportados</span>
                <span className="font-bold text-verde-primario">
                  {Math.min(opcoes.limite, totalDisponivel ?? opcoes.limite).toLocaleString("pt-BR")}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-texto-secundario">Formato</span>
                <span className="badge-info uppercase">{opcoes.formato}</span>
              </div>
            </div>

            {/* Aviso de volume grande */}
            {opcoes.limite > 1000 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <div className="flex gap-2">
                  <ExclamationTriangleIcon className="w-4 h-4 text-yellow-700 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-800">
                    <strong>Atenção:</strong> Você está exportando mais de 1.000 CPFs.
                    Confirme a ação abaixo.
                  </p>
                </div>
              </div>
            )}

            {confirmacao ? (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-center text-texto-principal">
                  Confirmar exportação de {opcoes.limite.toLocaleString("pt-BR")} CPFs?
                </p>
                <button className="btn-primario w-full justify-center" onClick={exportar} disabled={exportando}>
                  <CheckCircleIcon className="w-4 h-4" /> Sim, exportar
                </button>
                <button className="btn-secundario w-full justify-center" onClick={() => setConfirmacao(false)}>
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                className="btn-primario w-full justify-center py-3"
                onClick={exportar}
                disabled={exportando || totalDisponivel === 0}
              >
                {exportando ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Gerando...
                  </>
                ) : opcoes.formato === "clipboard" ? (
                  <><ClipboardDocumentIcon className="w-4 h-4" /> Copiar CPFs</>
                ) : (
                  <><ArrowDownTrayIcon className="w-4 h-4" /> Gerar e Baixar</>
                )}
              </button>
            )}

            {totalDisponivel === 0 && (
              <p className="text-xs text-red-600 text-center mt-2">
                Nenhum CPF disponível com esses filtros.
              </p>
            )}
          </div>

          {/* CPFs copiados para clipboard */}
          {clipboardCPFs && (
            <div className="card border border-green-300 bg-green-50">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircleIcon className="w-5 h-5 text-green-600" />
                <p className="font-semibold text-green-800 text-sm">
                  {clipboardCPFs.length} CPFs copiados!
                </p>
              </div>
              <div className="bg-white border border-green-200 rounded-lg p-3 max-h-48 overflow-y-auto">
                <pre className="text-xs font-mono text-texto-principal leading-5">
                  {clipboardCPFs.slice(0, 20).join("\n")}
                  {clipboardCPFs.length > 20 && `\n... e mais ${clipboardCPFs.length - 20}`}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Templates salvos */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-verde-primario uppercase tracking-wide">Templates Salvos</h2>
          <button
            className="btn-secundario py-1.5 text-xs"
            onClick={() => setTemplateAberto((v) => !v)}
          >
            <BookmarkIcon className="w-3.5 h-3.5" />
            {templateAberto ? "Cancelar" : "Salvar configuração atual"}
          </button>
        </div>

        {templateAberto && (
          <div className="flex gap-2 mb-4 p-3 bg-verde-fundo rounded-lg border border-verde-borda">
            <input
              className="input flex-1"
              placeholder={`Ex: ${nomeLista}`}
              value={nomeTemplate}
              onChange={(e) => setNomeTemplate(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && salvarTemplate()}
            />
            <button className="btn-primario whitespace-nowrap" onClick={salvarTemplate} disabled={salvandoTemplate}>
              <BookmarkIcon className="w-4 h-4" />
              {salvandoTemplate ? "Salvando..." : "Salvar"}
            </button>
          </div>
        )}

        {templates.length === 0 ? (
          <p className="text-sm text-texto-desabilitado text-center py-4">
            Nenhum template salvo. Clique em "Salvar configuração atual" para criar um.
          </p>
        ) : (
          <div className="space-y-2">
            {templates.map((t) => (
              <div key={t.id} className="flex items-center justify-between border border-verde-borda rounded-lg px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <BookmarkIcon className="w-4 h-4 text-verde-secundario shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-texto-principal truncate">{t.nome}</p>
                    <p className="text-xs text-texto-secundario">
                      {t.formato.toUpperCase()} · {t.limite.toLocaleString("pt-BR")} CPFs · {t.criado_em}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0 ml-3">
                  <button
                    className="btn-secundario py-1 text-xs"
                    onClick={() => carregarTemplate(t)}
                  >
                    Carregar
                  </button>
                  <button
                    className="btn-ghost p-1.5 text-texto-desabilitado hover:text-red-600"
                    onClick={() => excluirTemplate(t.id, t.nome)}
                    title="Excluir template"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Histórico de exportações */}
      {historico.length > 0 && (
        <div className="card">
          <h2 className="text-sm font-bold text-verde-primario mb-4 uppercase tracking-wide">
            Histórico de Exportações
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th rounded-tl-lg">Lista</th>
                  <th className="th text-right">CPFs</th>
                  <th className="th">Formato</th>
                  <th className="th">Não exportados?</th>
                  <th className="th rounded-tr-lg">Data</th>
                </tr>
              </thead>
              <tbody>
                {historico.map((h) => (
                  <tr key={h.id} className="tr">
                    <td className="td font-medium max-w-xs truncate">{h.nome_lista}</td>
                    <td className="td text-right font-bold">{h.quantidade_cpfs.toLocaleString("pt-BR")}</td>
                    <td className="td"><span className="badge-info uppercase">{h.formato}</span></td>
                    <td className="td text-xs">
                      {h.filtros?.apenas_nao_exportados
                        ? <span className="badge-ok">Sim</span>
                        : <span className="badge-neutro">Não</span>}
                    </td>
                    <td className="td text-xs text-texto-secundario">{h.exportado_em}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

