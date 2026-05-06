import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { importacaoAPI, conveniosAPI } from "../../services/api";
import toast from "react-hot-toast";
import {
  CloudArrowUpIcon, CheckCircleIcon, ExclamationTriangleIcon,
  DocumentTextIcon, ChevronRightIcon, ArrowPathIcon,
} from "@heroicons/react/24/outline";

function QualidadeBarra({ pct, label }) {
  const cor = pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-yellow-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-texto-secundario w-24 shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className={`${cor} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold w-8 text-right">{pct}%</span>
    </div>
  );
}

// ── Passo 1: Upload ────────────────────────────────────────────────────────
function formatarDuracao(segundos) {
  if (segundos == null) return "Não informado";
  if (segundos < 60) return `${segundos.toFixed(1).replace(".", ",")}s`;
  const minutos = Math.floor(segundos / 60);
  const resto = Math.round(segundos % 60);
  return `${minutos}min ${String(resto).padStart(2, "0")}s`;
}

function StepUpload({ onAnalisado }) {
  const [carregando, setCarregando] = useState(false);

  const onDrop = useCallback(async (arquivos) => {
    if (!arquivos.length) return;
    const arquivo = arquivos[0];
    const ext = arquivo.name.split(".").pop().toLowerCase();
    if (!["xlsx", "xls", "csv"].includes(ext)) {
      toast.error("Formato inválido. Use .xlsx, .xls ou .csv");
      return;
    }
    setCarregando(true);
    const fd = new FormData();
    fd.append("arquivo", arquivo);
    try {
      const res = await importacaoAPI.analisar(fd);
      toast.success(`Arquivo lido: ${res.data.total_linhas.toLocaleString("pt-BR")} linhas detectadas`);
      onAnalisado(res.data);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erro ao analisar arquivo.");
    } finally {
      setCarregando(false);
    }
  }, [onAnalisado]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
      "text/csv": [".csv"],
    },
    maxFiles: 1,
    disabled: carregando,
  });

  return (
    <div className="card max-w-2xl mx-auto">
      <h2 className="text-base font-bold text-verde-primario mb-1">Passo 1 — Selecionar arquivo</h2>
      <p className="text-sm text-texto-secundario mb-5">
        Arraste sua planilha ou clique para selecionar. Formatos aceitos: .xlsx, .xls, .csv
      </p>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors
          ${isDragActive ? "border-verde-secundario bg-verde-claro" : "border-verde-borda hover:border-verde-secundario hover:bg-verde-claro"}
          ${carregando ? "opacity-60 cursor-not-allowed" : ""}`}
      >
        <input {...getInputProps()} />
        {carregando ? (
          <>
            <ArrowPathIcon className="w-12 h-12 text-verde-secundario mx-auto mb-3 animate-spin" />
            <p className="text-verde-primario font-semibold">Analisando arquivo...</p>
          </>
        ) : isDragActive ? (
          <>
            <CloudArrowUpIcon className="w-12 h-12 text-verde-secundario mx-auto mb-3" />
            <p className="text-verde-primario font-semibold">Solte o arquivo aqui</p>
          </>
        ) : (
          <>
            <CloudArrowUpIcon className="w-12 h-12 text-verde-borda mx-auto mb-3" />
            <p className="text-texto-principal font-semibold mb-1">Arraste e solte sua planilha aqui</p>
            <p className="text-sm text-texto-desabilitado">ou clique para selecionar o arquivo</p>
            <p className="text-xs text-texto-desabilitado mt-3">
              Suporte: .xlsx · .xls · .csv
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ── Passo 2: Mapeamento de colunas ────────────────────────────────────────
const CAMPOS_PADRAO = [
  { value: "", label: "— Ignorar esta coluna —" },
  { value: "cpf", label: "CPF" },
  { value: "nome", label: "Nome" },
  { value: "data_nascimento", label: "Data de Nascimento" },
  { value: "idade", label: "Idade" },
  { value: "cidade", label: "Cidade" },
  { value: "uf", label: "UF" },
  { value: "convenio", label: "Convênio" },
  { value: "regiao", label: "Região" },
];

function StepMapeamento({ analise, onConfirmar }) {
  const [convenios, setConvenios] = useState([]);
  const [convenioId, setConvenioId] = useState("");
  const [regioes, setRegioes] = useState([]);
  const [regiaoId, setRegiaoId] = useState("");
  const [mapeamento, setMapeamento] = useState(() => {
    const m = {};
    Object.entries(analise.mapeamento).forEach(([col, info]) => {
      m[col] = info.campo_padrao || "";
    });
    return m;
  });

  useEffect(() => {
    conveniosAPI.listar().then((r) => {
      setConvenios(r.data);
      // Sugerir convênio
      if (analise.convenio_sugerido) {
        const conv = r.data.find(
          (c) => c.nome_convenio.toLowerCase() === analise.convenio_sugerido?.toLowerCase()
        );
        if (conv) {
          setConvenioId(String(conv.id));
          setRegioes(conv.regioes || []);
        }
      }
    });
  }, [analise.convenio_sugerido]);

  useEffect(() => {
    if (convenioId) {
      const conv = convenios.find((c) => String(c.id) === convenioId);
      const regs = conv?.regioes || [];
      setRegioes(regs);
      // Sugerir região
      if (analise.regiao_sugerida) {
        const reg = regs.find(
          (r) => r.nome_regiao.toLowerCase() === analise.regiao_sugerida?.toLowerCase()
        );
        if (reg) setRegiaoId(String(reg.id));
      }
    }
  }, [convenioId]);

  const temCPF = Object.values(mapeamento).includes("cpf");

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Avisos */}
      {analise.avisos?.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 space-y-1">
          {analise.avisos.map((a, i) => (
            <p key={i} className="text-sm text-yellow-800 flex items-center gap-2">
              <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0" />
              {a}
            </p>
          ))}
        </div>
      )}

      {/* Arquivo */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <DocumentTextIcon className="w-5 h-5 text-verde-secundario" />
          <div>
            <p className="text-sm font-semibold text-texto-principal">{analise.nome_arquivo}</p>
            <p className="text-xs text-texto-secundario">
              {analise.total_linhas.toLocaleString("pt-BR")} linhas detectadas
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Convênio</label>
            <select
              className="select"
              value={convenioId}
              onChange={(e) => setConvenioId(e.target.value)}
            >
              <option value="">— Selecione o convênio —</option>
              {convenios.map((c) => (
                <option key={c.id} value={c.id}>{c.nome_convenio}</option>
              ))}
            </select>
            {analise.convenio_sugerido && (
              <p className="text-xs text-texto-secundario mt-1">
                ⚡ Sugestão automática: <strong>{analise.convenio_sugerido}</strong>
              </p>
            )}
          </div>
          <div>
            <label className="label">Região</label>
            <select
              className="select"
              value={regiaoId}
              onChange={(e) => setRegiaoId(e.target.value)}
              disabled={!convenioId}
            >
              <option value="">— Selecione a região —</option>
              {regioes.map((r) => (
                <option key={r.id} value={r.id}>{r.nome_regiao}</option>
              ))}
            </select>
            {analise.regiao_sugerida && (
              <p className="text-xs text-texto-secundario mt-1">
                ⚡ Sugestão automática: <strong>{analise.regiao_sugerida}</strong>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Mapeamento de colunas */}
      <div className="card">
        <h3 className="text-sm font-bold text-verde-primario mb-1">
          Passo 2 — Confirmar mapeamento de colunas
        </h3>
        <p className="text-xs text-texto-secundario mb-4">
          O sistema detectou automaticamente as colunas. Revise e corrija se necessário.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th rounded-tl-lg w-1/3">Coluna na planilha</th>
                <th className="th w-1/3">Campo do sistema</th>
                <th className="th rounded-tr-lg w-1/3">Confiança</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(analise.mapeamento).map(([col, info]) => (
                <tr key={col} className="tr">
                  <td className="td font-mono text-xs">{col}</td>
                  <td className="td">
                    <select
                      className="select py-1"
                      value={mapeamento[col] || ""}
                      onChange={(e) =>
                        setMapeamento((prev) => ({ ...prev, [col]: e.target.value }))
                      }
                    >
                      {CAMPOS_PADRAO.map((op) => (
                        <option key={op.value} value={op.value}>{op.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="td">
                    {info.campo_padrao ? (
                      info.confianca >= 0.80 ? (
                        <span className="badge-ok flex items-center gap-1">
                          <CheckCircleIcon className="w-3 h-3" />
                          {Math.round(info.confianca * 100)}% — automático
                        </span>
                      ) : (
                        <span className="badge-aviso">
                          {Math.round(info.confianca * 100)}% — revise
                        </span>
                      )
                    ) : (
                      <span className="badge-neutro">Não detectado</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preview */}
      {analise.preview?.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-bold text-verde-primario mb-3">
            Passo 3 — Preview (primeiras 5 linhas)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  {analise.headers.slice(0, 8).map((h) => (
                    <th key={h} className="th py-2">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {analise.preview.map((row, i) => (
                  <tr key={i} className="tr">
                    {analise.headers.slice(0, 8).map((h) => (
                      <td key={h} className="td py-1.5 text-xs max-w-[120px] truncate">
                        {row[h] || ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Botão confirmar */}
      {!temCPF && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          ⚠ Nenhuma coluna foi mapeada como <strong>CPF</strong>. Corrija o mapeamento antes de importar.
        </div>
      )}

      <div className="flex justify-end">
        <button
          className="btn-primario"
          disabled={!temCPF}
          onClick={() => onConfirmar({ mapeamento, convenioId, regiaoId })}
        >
          Iniciar Importação
          <ChevronRightIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Passo 3: Resultado ─────────────────────────────────────────────────────
function StepResultado({ resultado, onNova }) {
  const { status, total, novos, duplicados, invalidos, erros, base_id, duracao_segundos, metricas } = resultado;
  const sucesso = status === "concluido" || status === "parcial";
  const [qualidade, setQualidade] = useState(null);

  useEffect(() => {
    if (base_id && sucesso) {
      importacaoAPI.detalheBase(base_id)
        .then((r) => setQualidade(r.data.qualidade))
        .catch(() => {});
    }
  }, [base_id, sucesso]);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className={`card border-2 ${sucesso ? "border-green-300" : "border-red-300"}`}>
        <div className="flex items-center gap-3 mb-4">
          {sucesso ? (
            <CheckCircleIcon className="w-8 h-8 text-green-600" />
          ) : (
            <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
          )}
          <div>
            <h2 className="font-bold text-lg text-texto-principal">
              {sucesso ? "Importação concluída!" : "Erro na importação"}
            </h2>
            <p className="text-sm text-texto-secundario capitalize">Status: {status}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-verde-claro rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-verde-primario">{total?.toLocaleString("pt-BR")}</p>
            <p className="text-xs text-texto-secundario mt-0.5">Total lido</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-700">{novos?.toLocaleString("pt-BR")}</p>
            <p className="text-xs text-texto-secundario mt-0.5">CPFs novos adicionados</p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-yellow-700">{duplicados}</p>
            <p className="text-xs text-texto-secundario mt-0.5">Duplicados (já existiam)</p>
          </div>
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-red-600">{invalidos}</p>
            <p className="text-xs text-texto-secundario mt-0.5">CPFs inválidos</p>
          </div>
        </div>

        {duracao_segundos != null && (
          <div className="bg-blue-50 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-texto-secundario">Tempo de importação</p>
                <p className="text-lg font-bold text-blue-800">{formatarDuracao(duracao_segundos)}</p>
              </div>
              {metricas && (
                <div className="text-right text-xs text-blue-800">
                  <p>Planilha: {formatarDuracao(metricas.processar_planilha_segundos)}</p>
                  <p>Banco: {formatarDuracao(metricas.gravar_banco_segundos)}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Indicadores de qualidade */}
        {qualidade && (
          <div className="border-t border-verde-claro pt-4 mt-2 space-y-2">
            <p className="text-xs font-semibold text-texto-secundario uppercase tracking-wide mb-3">
              Qualidade dos dados importados
            </p>
            <QualidadeBarra pct={qualidade.pct_nome} label="Com nome" />
            <QualidadeBarra pct={qualidade.pct_cidade} label="Com cidade" />
            <QualidadeBarra pct={qualidade.pct_nascimento} label="Com nascimento" />
          </div>
        )}

        {erros?.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-3 mt-4">
            <p className="text-xs font-semibold text-texto-secundario mb-2">
              Primeiros erros encontrados:
            </p>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {erros.map((e, i) => (
                <p key={i} className="text-xs text-red-600">
                  Linha {e.linha}: {e.motivo}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 justify-end">
        <button className="btn-secundario" onClick={onNova}>
          Importar outra base
        </button>
        <a href="/dashboard" className="btn-primario">
          Ver Dashboard
        </a>
      </div>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────
export default function Importacao() {
  const [passo, setPasso] = useState(1);
  const [analise, setAnalise] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [importando, setImportando] = useState(false);

  const handleAnalisado = (data) => {
    setAnalise(data);
    setPasso(2);
  };

  const handleConfirmar = async ({ mapeamento, convenioId, regiaoId }) => {
    setImportando(true);
    try {
      const res = await importacaoAPI.executar({
        temp_id: analise.temp_id,
        nome_arquivo: analise.nome_arquivo,
        extensao: analise.extensao,
        mapeamento,
        convenio_id: convenioId || null,
        regiao_id: regiaoId || null,
      });
      setResultado(res.data);
      setPasso(3);
      if (res.data.status === "concluido") {
        toast.success(`${res.data.novos?.toLocaleString("pt-BR")} CPFs novos importados!`);
      } else {
        toast(`Importação parcial: ${res.data.invalidos} erros`, { icon: "⚠️" });
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erro ao executar importação.");
    } finally {
      setImportando(false);
    }
  };

  const reiniciar = () => {
    setAnalise(null);
    setResultado(null);
    setPasso(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-verde-primario">Importar Base</h1>
        <p className="text-sm text-texto-secundario mt-0.5">
          Importe planilhas de CPFs com detecção automática de colunas
        </p>
      </div>

      {/* Indicador de passos */}
      <div className="flex items-center gap-2 max-w-2xl">
        {[
          { n: 1, label: "Upload" },
          { n: 2, label: "Mapeamento" },
          { n: 3, label: "Resultado" },
        ].map(({ n, label }, i, arr) => (
          <div key={n} className="flex items-center gap-2">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold
              ${passo === n ? "bg-verde-primario text-white" :
                passo > n ? "bg-verde-claro text-verde-primario" : "bg-white border border-verde-borda text-texto-desabilitado"}`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold
                ${passo === n ? "bg-white/20" : ""}`}>
                {passo > n ? "✓" : n}
              </span>
              {label}
            </div>
            {i < arr.length - 1 && (
              <ChevronRightIcon className="w-4 h-4 text-verde-borda" />
            )}
          </div>
        ))}
      </div>

      {/* Conteúdo do passo */}
      {importando ? (
        <div className="card max-w-2xl mx-auto text-center py-12">
          <ArrowPathIcon className="w-12 h-12 text-verde-secundario mx-auto mb-4 animate-spin" />
          <p className="text-verde-primario font-semibold text-lg">Importando registros...</p>
          <p className="text-texto-secundario text-sm mt-2">
            Validando CPFs, detectando duplicatas e salvando no Data Platform.
          </p>
        </div>
      ) : passo === 1 ? (
        <StepUpload onAnalisado={handleAnalisado} />
      ) : passo === 2 ? (
        <StepMapeamento analise={analise} onConfirmar={handleConfirmar} />
      ) : (
        <StepResultado resultado={resultado} onNova={reiniciar} />
      )}
    </div>
  );
}

