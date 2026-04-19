// src/pages/LoginPage.tsx
// ─── Firebase-backed Login Page ────────────────────────────────────────────────

import { useState } from "react";
import { authLogin } from "../store";

interface LoginPageProps {
  onLogin:    () => void;
  onRegister: () => void;
}

export default function LoginPage({ onLogin, onRegister }: LoginPageProps) {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await authLogin(email, password);
    setLoading(false);

    if (result.ok) {
      onLogin();
    } else {
      setError(result.error ?? "Erro ao fazer login.");
    }
  };

  

  return (
    <div className="login-bg">
      <div className="login-card">
        <div className="login-header">
          <div
            style={{
              width: 80, height: 80, borderRadius: "50%",
              background: "linear-gradient(135deg,#55a0a6,#3d7a7f)",
              margin: "0 auto 15px",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <i className="bi bi-truck" style={{ color: "white", fontSize: 36 }} />
          </div>
          <h2>Gestão de Frota</h2>
          <p style={{ color: "#999", fontSize: 14, marginTop: 4 }}>
            Faça login para aceder ao sistema
          </p>
        </div>

        {error && (
          <div className="alert alert-danger show" role="alert">
            <i className="bi bi-exclamation-triangle-fill" style={{ marginRight: 8 }} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} autoComplete="off">
          <div className="form-group">
            <label className="form-label">Nome (ou e-mail)</label>
            <input
              type="text" className="form-control" required
              placeholder="Introduza o seu nome de utilizador"
              autoComplete="off"
              value={email} onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Senha</label>
            <input
              type="password" className="form-control" required
              autoComplete="new-password"
              value={password} onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="btn-login text-white" disabled={loading}>
            {loading
              ? <><span className="loading-spinner" style={{ marginRight: 8, width: 16, height: 16 }} />A entrar...</>
              : "Entrar"}
          </button>
        </form>

        <div style={{ marginTop: 16, textAlign: "center", fontSize: 13, color: "#888" }}>
          É um cliente?{" "}
          <button
            onClick={onRegister}
            style={{ background: "none", border: "none", color: "var(--primary-color)", cursor: "pointer", fontWeight: 600 }}
          >
            Crie a sua conta
          </button>
        </div>
      </div>
    </div>
  );
}
