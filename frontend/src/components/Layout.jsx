import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  HomeIcon, ArrowUpTrayIcon, MagnifyingGlassIcon,
  ArrowDownTrayIcon, ChartBarIcon, Cog6ToothIcon,
  ArrowRightOnRectangleIcon, Bars3Icon, XMarkIcon,
  UserCircleIcon, BuildingOfficeIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";

const nav = [
  { to: "/dashboard",   label: "Dashboard",    Icon: HomeIcon },
  { to: "/importacao",  label: "Importar Base", Icon: ArrowUpTrayIcon },
  { to: "/busca",       label: "Busca Avançada",Icon: MagnifyingGlassIcon },
  { to: "/exportacao",  label: "Exportar CPFs", Icon: ArrowDownTrayIcon },
  { to: "/relatorios",  label: "Relatórios",    Icon: ChartBarIcon },
  { to: "/configuracoes", label: "Configurações", Icon: Cog6ToothIcon },
];

export default function Layout({ children }) {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarAberta, setSidebarAberta] = useState(true);

  const handleLogout = async () => {
    await logout();
    toast.success("Sessão encerrada.");
    navigate("/login");
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Sidebar ── */}
      <aside
        className={`flex flex-col bg-verde-primario text-white transition-all duration-200
          ${sidebarAberta ? "w-60" : "w-16"} flex-shrink-0`}
      >
        {/* Logo / marca */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-green-800">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
            <img
              src="/"
              alt="Internal Data Platform"
              className="w-6 h-6 object-contain"
            />
          </div>
          {sidebarAberta && (
            <div className="min-w-0">
              <p className="font-bold text-sm leading-tight">Demo</p>
              <p className="text-green-300 text-xs leading-tight">Consultoria</p>
            </div>
          )}
        </div>

        {/* Navegação */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {nav.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm font-medium
                 transition-colors duration-100 group
                 ${isActive
                   ? "bg-white/15 text-white"
                   : "text-green-200 hover:bg-white/10 hover:text-white"
                 }`
              }
              title={!sidebarAberta ? label : ""}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {sidebarAberta && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Usuário e sair */}
        <div className="border-t border-green-800 p-3">
          {sidebarAberta && usuario && (
            <div className="flex items-center gap-2 px-2 py-2 mb-2">
              <UserCircleIcon className="w-7 h-7 text-green-300 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate">{usuario.nome}</p>
                <p className="text-xs text-green-300 capitalize">{usuario.perfil}</p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-2 py-2 rounded-lg
                       text-green-200 hover:bg-white/10 hover:text-white text-sm transition-colors"
            title="Sair"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5 flex-shrink-0" />
            {sidebarAberta && <span>Sair</span>}
          </button>
        </div>
      </aside>

      {/* ── Conteúdo principal ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-verde-borda px-6 py-3 flex items-center justify-between flex-shrink-0">
          <button
            onClick={() => setSidebarAberta((v) => !v)}
            className="p-1.5 rounded-lg hover:bg-verde-claro text-verde-primario transition-colors"
          >
            {sidebarAberta ? <XMarkIcon className="w-5 h-5" /> : <Bars3Icon className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-3 text-sm text-texto-secundario">
            <BuildingOfficeIcon className="w-4 h-4" />
            <span className="font-medium">Internal Data Platform</span>
            <span className="text-verde-borda">·</span>
            <span>Sistema de Gestão de Bases CPF</span>
          </div>
        </header>

        {/* Área de conteúdo */}
        <main className="flex-1 overflow-y-auto p-6 bg-verde-fundo">
          {children}
        </main>
      </div>
    </div>
  );
}

