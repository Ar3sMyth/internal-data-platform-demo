import { useState, useEffect } from "react";
import { importacaoAPI, logsAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { TrashIcon, ExclamationTriangleIcon, ChartBarIcon } from "@heroicons/react/24/outline";

function StatusBadge({ status }) {
  const map = {
    concluido: <span className="badge-ok">Concluído</span>,
    parcial:   <span className="badge-aviso">Parcial</span>,
    erro:      <span className="badge-erro">Erro</span>,
    processando: <span className="badge-info">Processando</span>,
  };
  return map[status] || <span className="badge-neutro">{status}</span>;
}

function QualidadeBarra({ pct, label }) {
  const cor = pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-yellow-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-texto-secundario w-20 shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
        <div className={`${cor} h-1.5 rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold w-8 text-right">{pct}%</span>
    </div>
  );
}

function ModalConfirmarBase({ base, onConfirmar, onFechar, excluindo }) {
  const [excluirOrfaos, setExcluirOrfaos] = useState(false);
  const [qualidade, setQualidade] = useState(null);

  useEffect(() => {
    importacaoAPI.detalheBase(base.id).then((r) => setQualidade(r.data.qualidade));
  }, [base.id]);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex items-center gap-3 p-5 border-b border-red-100">
          <ExclamationTriangleIcon className="w-6 h-6 text-red-500 shrink-0" />
          <h3 className="font-bold text-red-600">Excluir Base Importada</h3>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-texto-principal">
            Base: <strong>{base.nome_arquivo}</strong> —{" "}
            <strong>{base.quantidade_validos?.toLocaleString("pt-BR")}</strong> CPFs válidos.
          </p>
          {qualidade && (
            <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
              <p className="text-xs font-semibold text-texto-secundario mb-2">Qualidade dos dados</p>
              <QualidadeBarra pct={qualidade.pct_nome} label="Com nome" />
              <QualidadeBarra pct={qualidade.pct_cidade} label="Com cidade" />
              <QualidadeBarra pct={qualidade.pct_nascimento} label="Com nascimento" />
            </div>
          )}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" className="mt-0.5 rounded accent-amber-600"
                checked={excluirOrfaos} onChange={(e) => setExcluirOrfaos(e.target.checked)} />
              <div>
                <p className="text-sm font-semibold text-amber-800">Também excluir CPFs exclusivos desta base</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Exclui permanentemente os CPFs que existem <em>somente</em> nesta base.
                </p>
              </div>
            </label>
          </div>
          <p className="text-xs text-texto-desabilitado">Esta ação não pode ser desfeita.</p>
        </div>
        <div className="flex justify-end gap-3 p-5 border-t border-red-100">
          <button className="btn-secundario" onClick={onFechar} disabled={excluindo}>Cancelar</button>
          <button
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-60"
            onClick={() => onConfirmar(excluirOrfaos)} disabled={excluindo}
          >
            <TrashIcon className="w-4 h-4" />
            {excluindo ? "Excluindo..." : "Excluir base"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AbaBasesSobreposicao({ bases }) {
  const [base1, setBase1] = useState("");
  const [base2, setBase2] = useState("");
  const [resultado, setResultado] = useState(null);
  const [comparando, setComparando] = useState(false);

  const comparar = async () => {
    if (!base1 || !base2 || base1 === base2) {
      toast.error("Selecione duas bases diferentes.");
      return;
    }
    setComparando(true);
    try {
      const res = await importacaoAPI.sobreposicao(base1, base2);
      setResultado(res.data);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erro ao comparar bases.");
    } finally {
      setComparando(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="card">
        <h2 className="text-sm font-bold text-verde-primario mb-4 uppercase tracking-wide">
          Comparar duas bases
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div>
            <label className="label">Base 1</label>
            <select className="select" value={base1} onChange={(e) => setBase1(e.target.value)}>
              <option value="">Selecionar base...</option>
              {bases.map((b) => <option key={b.id} value={b.id}>{b.nome_arquivo}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Base 2</label>
            <select className="select" value={base2} onChange={(e) => setBase2(e.target.value)}>
              <option value="">Selecionar base...</option>
              {bases.map((b) => <option key={b.id} value={b.id}>{b.nome_arquivo}</option>)}
            </select>
          </div>
          <button className="btn-primario" onClick={comparar} disabled={comparando || !base1 || !base2}>
            <ChartBarIcon className="w-4 h-4" />
            {comparando ? "Comparando..." : "Comparar"}
          </button>
        </div>
      </div>

      {resultado && (
        <div className="card">
          <h2 className="text-sm font-bold text-verde-primario mb-4 uppercase tracking-wide">Resultado da Comparação</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-blue-700">{resultado.base1.total.toLocaleString("pt-BR")}</p>
              <p className="text-xs text-blue-600 mt-1 truncate" title={resultado.base1.nome}>{resultado.base1.nome}</p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-purple-700">{resultado.base2.total.toLocaleString("pt-BR")}</p>
              <p className="text-xs text-purple-600 mt-1 truncate" title={resultado.base2.nome}>{resultado.base2.nome}</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-amber-700">{resultado.sobrepostos.toLocaleString("pt-BR")}</p>
              <p className="text-xs text-amber-600 mt-1">CPFs em comum</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-green-700">{resultado.percentual_sobreposicao}%</p>
              <p className="text-xs text-green-600 mt-1">Sobreposição</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="border border-verde-borda rounded-lg p-4">
              <p className="text-sm font-semibold text-texto-principal mb-1">Exclusivos da Base 1</p>
              <p className="text-2xl font-bold text-verde-primario">{resultado.apenas_base1.toLocaleString("pt-BR")}</p>
              <p className="text-xs text-texto-secundario mt-1">Não aparecem na Base 2</p>
            </div>
            <div className="border border-verde-borda rounded-lg p-4">
              <p className="text-sm font-semibold text-texto-principal mb-1">Exclusivos da Base 2</p>
              <p className="text-2xl font-bold text-verde-primario">{resultado.apenas_base2.toLocaleString("pt-BR")}</p>
              <p className="text-xs text-texto-secundario mt-1">Não aparecem na Base 1</p>
            </div>
          </div>

          {resultado.percentual_sobreposicao > 50 && (
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              ⚠️ <strong>Alta sobreposição detectada.</strong> Mais de metade dos CPFs da Base 1 já existem na Base 2. Considere se ambas as importações são necessárias.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Relatorios() {
  const { usuario } = useAuth();
  const [bases, setBases] = useState([]);
  const [logs, setLogs] = useState([]);
  const [aba, setAba] = useState("bases");
  const [carregando, setCarregando] = useState(false);
  const [baseParaExcluir, setBaseParaExcluir] = useState(null);
  const [excluindo, setExcluindo] = useState(false);

  const carregarBases = () => {
    setCarregando(true);
    importacaoAPI.listarBases().then((r) => setBases(r.data)).finally(() => setCarregando(false));
  };

  useEffect(() => {
    if (aba === "bases" || aba === "sobreposicao") {
      if (bases.length === 0) carregarBases();
      else setCarregando(false);
    } else {
      setCarregando(true);
      logsAPI.listar().then((r) => setLogs(r.data)).catch(() => {}).finally(() => setCarregando(false));
    }
  }, [aba]);

  const confirmarExclusaoBase = async (excluirOrfaos) => {
    if (!baseParaExcluir) return;
    setExcluindo(true);
    try {
      const res = await importacaoAPI.excluirBase(baseParaExcluir.id, { excluir_cpfs_orfaos: excluirOrfaos });
      const orfaos = res.data.cpfs_orfaos_excluidos || 0;
      let msg = "Base excluída com sucesso.";
      if (orfaos > 0) msg += ` ${orfaos} CPF${orfaos !== 1 ? "s" : ""} exclusivo${orfaos !== 1 ? "s" : ""} removido${orfaos !== 1 ? "s" : ""}.`;
      toast.success(msg);
      setBaseParaExcluir(null);
      carregarBases();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erro ao excluir base.");
    } finally {
      setExcluindo(false);
    }
  };

  const abas = [
    { key: "bases", label: "Bases Importadas" },
    { key: "sobreposicao", label: "Sobreposição" },
    { key: "logs", label: "Logs do Sistema" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-verde-primario">Relatórios</h1>
        <p className="text-sm text-texto-secundario mt-0.5">Histórico de bases importadas e auditoria do sistema</p>
      </div>

      <div className="flex gap-2 border-b border-verde-borda">
        {abas.map((a) => (
          <button key={a.key} onClick={() => setAba(a.key)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors
              ${aba === a.key ? "border-verde-primario text-verde-primario" : "border-transparent text-texto-desabilitado hover:text-texto-principal"}`}>
            {a.label}
          </button>
        ))}
      </div>

      {carregando ? (
        <div className="text-center py-12 text-texto-desabilitado">Carregando...</div>
      ) : aba === "sobreposicao" ? (
        <AbaBasesSobreposicao bases={bases} />
      ) : aba === "bases" ? (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th">Arquivo</th>
                  <th className="th">Convênio</th>
                  <th className="th">Região</th>
                  <th className="th text-right">Total</th>
                  <th className="th text-right">Válidos</th>
                  <th className="th text-right">Inválidos</th>
                  <th className="th text-right">Duplicados</th>
                  <th className="th">Data</th>
                  <th className="th">Status</th>
                  {usuario?.perfil === "administrador" && <th className="th w-12"></th>}
                </tr>
              </thead>
              <tbody>
                {bases.length === 0 ? (
                  <tr><td colSpan={usuario?.perfil === "administrador" ? 10 : 9} className="td text-center py-10 text-texto-desabilitado">Nenhuma base importada.</td></tr>
                ) : bases.map((b) => (
                  <tr key={b.id} className="tr">
                    <td className="td font-medium max-w-[200px] truncate text-xs">{b.nome_arquivo}</td>
                    <td className="td text-xs">{b.convenio || "—"}</td>
                    <td className="td text-xs">{b.regiao || "—"}</td>
                    <td className="td text-right">{b.quantidade_registros.toLocaleString("pt-BR")}</td>
                    <td className="td text-right text-green-700 font-medium">{b.quantidade_validos.toLocaleString("pt-BR")}</td>
                    <td className="td text-right text-red-600">{b.quantidade_invalidos}</td>
                    <td className="td text-right text-yellow-700">{b.quantidade_duplicados}</td>
                    <td className="td text-xs text-texto-secundario">{b.data_importacao}</td>
                    <td className="td"><StatusBadge status={b.status_importacao} /></td>
                    {usuario?.perfil === "administrador" && (
                      <td className="td">
                        <button className="btn-ghost p-1 text-texto-desabilitado hover:text-red-600"
                          onClick={() => setBaseParaExcluir(b)} title="Excluir base">
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th">Tipo</th>
                  <th className="th">Ação</th>
                  <th className="th">Usuário</th>
                  <th className="th">IP</th>
                  <th className="th">Data</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr><td colSpan={5} className="td text-center py-10 text-texto-desabilitado">Sem permissão ou nenhum log registrado.</td></tr>
                ) : logs.map((l) => (
                  <tr key={l.id} className="tr">
                    <td className="td">
                      <span className={l.tipo === "error" ? "badge-erro" : l.tipo === "importacao" ? "badge-info" : l.tipo === "exportacao" ? "badge-ok" : l.tipo === "seguranca" ? "badge-aviso" : "badge-neutro"}>{l.tipo}</span>
                    </td>
                    <td className="td text-xs max-w-xs truncate">{l.acao}</td>
                    <td className="td text-xs">{l.usuario || "Sistema"}</td>
                    <td className="td text-xs font-mono">{l.ip_origem || "—"}</td>
                    <td className="td text-xs text-texto-secundario">{l.criado_em}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {baseParaExcluir && (
        <ModalConfirmarBase base={baseParaExcluir} onConfirmar={confirmarExclusaoBase}
          onFechar={() => !excluindo && setBaseParaExcluir(null)} excluindo={excluindo} />
      )}
    </div>
  );
}

