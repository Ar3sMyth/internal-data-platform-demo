import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { LockClosedIcon, EnvelopeIcon } from "@heroicons/react/24/outline";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", senha: "" });
  const [carregando, setCarregando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCarregando(true);
    try {
      await login(form.email, form.senha);
      navigate("/dashboard");
    } catch (err) {
      const msg = err.response?.data?.non_field_errors?.[0]
        || err.response?.data?.detail
        || "Erro ao fazer login. Verifique suas credenciais.";
      toast.error(msg);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-verde-fundo flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img
            src="/"
            alt="Internal Data Platform"
            className="h-16 w-auto object-contain mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-verde-primario">Internal Data Platform</h1>
          <p className="text-texto-secundario text-sm mt-1">Sistema de Gestão de Bases CPF</p>
        </div>

        {/* Card de login */}
        <div className="card">
          <h2 className="text-lg font-semibold text-texto-principal mb-6">Acesso ao sistema</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">E-mail</label>
              <div className="relative">
                <EnvelopeIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-texto-desabilitado" />
                <input
                  type="email"
                  className="input pl-9"
                  placeholder="seu@email.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="label">Senha</label>
              <div className="relative">
                <LockClosedIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-texto-desabilitado" />
                <input
                  type="password"
                  className="input pl-9"
                  placeholder="••••••••"
                  value={form.senha}
                  onChange={(e) => setForm({ ...form, senha: e.target.value })}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={carregando}
              className="btn-primario w-full justify-center py-3 mt-2"
            >
              {carregando ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Entrando...
                </>
              ) : "Entrar"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-texto-desabilitado mt-6">
          ⚠ Acesso restrito — Internal Data Platform
        </p>
      </div>
    </div>
  );
}

