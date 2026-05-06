import { useEffect, useState } from "react";
import { pessoasAPI } from "../../services/api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  UsersIcon, FolderOpenIcon, BuildingOfficeIcon, CheckCircleIcon,
  XCircleIcon, ArrowDownTrayIcon, ClockIcon, NoSymbolIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";

const CORES = ["#004632", "#006347", "#008C5C", "#00B377", "#33C992"];

function CardStat({ label, valor, Icon, cor = "verde", sub }) {
  const cores = {
    verde:    "bg-verde-claro border-verde-borda text-verde-primario",
    azul:     "bg-blue-50 border-blue-200 text-blue-800",
    amarelo:  "bg-yellow-50 border-yellow-200 text-yellow-800",
    vermelho: "bg-red-50 border-red-200 text-red-800",
    cinza:    "bg-gray-50 border-gray-200 text-gray-700",
  };
  return (
    <div className={`border rounded-xl p-5 flex items-start gap-4 ${cores[cor]}`}>
      <div className="mt-0.5">
        <Icon className="w-7 h-7 opacity-80" />
      </div>
      <div>
        <p className="text-2xl font-bold">{valor?.toLocaleString("pt-BR") ?? "—"}</p>
        <p className="text-sm font-medium mt-0.5">{label}</p>
        {sub && <p className="text-xs opacity-70 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    concluido: <span className="badge-ok">Concluído</span>,
    parcial:   <span className="badge-aviso">Parcial</span>,
    erro:      <span className="badge-erro">Erro</span>,
    processando: <span className="badge-info">Processando</span>,
  };
  return map[status] || <span className="badge-neutro">{status}</span>;
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    pessoasAPI.dashboard()
      .then((r) => setStats(r.data))
      .catch(() => toast.error("Erro ao carregar dashboard."))
      .finally(() => setCarregando(false));
  }, []);

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-texto-secundario">
          <svg className="animate-spin w-8 h-8 mx-auto mb-3 text-verde-primario" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <p>Carregando indicadores...</p>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-xl font-bold text-verde-primario">Dashboard</h1>
        <p className="text-sm text-texto-secundario mt-0.5">
          Visão geral do Plataforma de Dados Operacionais — Internal Data Platform
        </p>
      </div>

      {/* Cards principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <CardStat label="Total de CPFs" valor={stats.total_cpfs} Icon={UsersIcon} cor="verde" />
        <CardStat label="Bases Importadas" valor={stats.total_bases} Icon={FolderOpenIcon} cor="azul" />
        <CardStat label="Convênios Ativos" valor={stats.total_convenios} Icon={BuildingOfficeIcon} cor="cinza" />
        <CardStat
          label="Ainda não Exportados"
          valor={stats.total_nao_exportados}
          Icon={ClockIcon}
          cor="amarelo"
          sub="CPFs disponíveis para uso"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <CardStat label="CPFs Válidos" valor={stats.total_validos} Icon={CheckCircleIcon} cor="verde" />
        <CardStat label="CPFs Inválidos" valor={stats.total_invalidos} Icon={XCircleIcon} cor="vermelho" />
        <CardStat
          label="Já Exportados"
          valor={stats.total_exportados}
          Icon={ArrowDownTrayIcon}
          cor="cinza"
          sub="CPFs já usados em higienização"
        />
        <CardStat
          label="Bloqueados"
          valor={stats.total_bloqueados}
          Icon={NoSymbolIcon}
          cor="cinza"
          sub="Excluídos de exportações"
        />
      </div>

      {/* Gráficos e tabelas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Por Convênio */}
        <div className="card">
          <h2 className="text-sm font-bold text-verde-primario mb-4 uppercase tracking-wide">
            CPFs por Convênio
          </h2>
          {stats.por_convenio.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.por_convenio} layout="vertical" margin={{ left: 0, right: 20 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => v.toLocaleString("pt-BR")} />
                <YAxis type="category" dataKey="convenio" tick={{ fontSize: 11 }} width={130} />
                <Tooltip
                  formatter={(v) => [v.toLocaleString("pt-BR"), "CPFs"]}
                  contentStyle={{ fontSize: 12, borderColor: "#C2DDD2" }}
                />
                <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                  {stats.por_convenio.map((_, i) => (
                    <Cell key={i} fill={CORES[i % CORES.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-texto-desabilitado text-center py-8">Nenhuma base importada ainda.</p>
          )}
        </div>

        {/* Por Região */}
        <div className="card">
          <h2 className="text-sm font-bold text-verde-primario mb-4 uppercase tracking-wide">
            CPFs por Região
          </h2>
          {stats.por_regiao.length > 0 ? (
            <div className="space-y-2">
              {stats.por_regiao.map((r, i) => {
                const max = stats.por_regiao[0]?.total || 1;
                const pct = Math.round((r.total / max) * 100);
                return (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-texto-principal font-medium">{r.regiao}</span>
                      <span className="text-texto-secundario">{r.total.toLocaleString("pt-BR")}</span>
                    </div>
                    <div className="w-full bg-verde-claro rounded-full h-1.5">
                      <div
                        className="bg-verde-primario h-1.5 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-texto-desabilitado text-center py-8">Nenhuma região cadastrada ainda.</p>
          )}
        </div>
      </div>

      {/* Faixas etárias */}
      {stats.distribuicao_idades?.some((f) => f.total > 0) && (
        <div className="card">
          <h2 className="text-sm font-bold text-verde-primario mb-4 uppercase tracking-wide">
            Distribuição por Faixa Etária
          </h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={stats.distribuicao_idades} margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
              <XAxis dataKey="faixa" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => v.toLocaleString("pt-BR")} />
              <Tooltip
                formatter={(v) => [v.toLocaleString("pt-BR"), "CPFs"]}
                contentStyle={{ fontSize: 12, borderColor: "#C2DDD2" }}
              />
              <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                {stats.distribuicao_idades.map((_, i) => (
                  <Cell key={i} fill={CORES[i % CORES.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Últimas importações */}
      <div className="card">
        <h2 className="text-sm font-bold text-verde-primario mb-4 uppercase tracking-wide">
          Últimas Importações
        </h2>
        {stats.ultimas_importacoes.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th rounded-tl-lg">Arquivo</th>
                  <th className="th">Convênio</th>
                  <th className="th">Região</th>
                  <th className="th text-right">Válidos</th>
                  <th className="th text-right">Inválidos</th>
                  <th className="th text-right">Duplicados</th>
                  <th className="th">Data</th>
                  <th className="th rounded-tr-lg">Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.ultimas_importacoes.map((b) => (
                  <tr key={b.id} className="tr">
                    <td className="td font-medium max-w-xs truncate">{b.nome_arquivo}</td>
                    <td className="td">{b.convenio || "—"}</td>
                    <td className="td">{b.regiao || "—"}</td>
                    <td className="td text-right text-green-700 font-medium">{b.quantidade_validos.toLocaleString("pt-BR")}</td>
                    <td className="td text-right text-red-600">{b.quantidade_invalidos}</td>
                    <td className="td text-right text-yellow-700">{b.quantidade_duplicados}</td>
                    <td className="td text-xs text-texto-secundario">{b.data_importacao}</td>
                    <td className="td"><StatusBadge status={b.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-texto-desabilitado text-center py-6">
            Nenhuma importação realizada ainda.{" "}
            <a href="/importacao" className="text-verde-secundario font-medium hover:underline">
              Importar primeira base →
            </a>
          </p>
        )}
      </div>

      {/* Últimas exportações */}
      {stats.ultimas_exportacoes.length > 0 && (
        <div className="card">
          <h2 className="text-sm font-bold text-verde-primario mb-4 uppercase tracking-wide">
            Últimas Exportações
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th rounded-tl-lg">Lista</th>
                  <th className="th text-right">CPFs</th>
                  <th className="th">Formato</th>
                  <th className="th rounded-tr-lg">Data</th>
                </tr>
              </thead>
              <tbody>
                {stats.ultimas_exportacoes.map((e) => (
                  <tr key={e.id} className="tr">
                    <td className="td font-medium">{e.nome_lista}</td>
                    <td className="td text-right font-semibold">{e.quantidade_cpfs.toLocaleString("pt-BR")}</td>
                    <td className="td">
                      <span className="badge-info uppercase">{e.formato}</span>
                    </td>
                    <td className="td text-xs text-texto-secundario">{e.exportado_em}</td>
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

