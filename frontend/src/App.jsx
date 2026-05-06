import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/dashboard/Dashboard";
import Importacao from "./pages/importacao/Importacao";
import Busca from "./pages/busca/Busca";
import Exportacao from "./pages/exportacao/Exportacao";
import Relatorios from "./pages/Relatorios";
import Configuracoes from "./pages/Configuracoes";

function RotaProtegida({ children }) {
  const { usuario, carregando } = useAuth();
  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-verde-fundo">
        <div className="text-center">
          <div className="w-16 h-12 bg-white rounded-lg flex items-center justify-center mx-auto mb-4 shadow-sm">
            <img
              src="/"
              alt="Internal Data Platform"
              className="h-8 w-auto object-contain"
            />
          </div>
          <p className="text-texto-secundario text-sm">Carregando...</p>
        </div>
      </div>
    );
  }
  if (!usuario) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { fontSize: "13px", maxWidth: "380px" },
            success: { iconTheme: { primary: "#004632", secondary: "#fff" } },
          }}
        />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<RotaProtegida><Dashboard /></RotaProtegida>} />
          <Route path="/importacao" element={<RotaProtegida><Importacao /></RotaProtegida>} />
          <Route path="/busca" element={<RotaProtegida><Busca /></RotaProtegida>} />
          <Route path="/exportacao" element={<RotaProtegida><Exportacao /></RotaProtegida>} />
          <Route path="/relatorios" element={<RotaProtegida><Relatorios /></RotaProtegida>} />
          <Route path="/configuracoes" element={<RotaProtegida><Configuracoes /></RotaProtegida>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

