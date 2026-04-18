// pages/LoginPage.tsx
import { useState } from "react";
import { authLogin } from "../store";

interface LoginPageProps {
  onLogin: () => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail]       = useState("admin@gmail.com");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // small delay to simulate async (mirrors original Firebase call)
    await new Promise((r) => setTimeout(r, 300));

    const result = authLogin(email, password);
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
          {/* Logo placeholder (original uses logo.jpg) */}
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
          <p id="formTitle" style={{ color: "#999", fontSize: 14, marginTop: 4 }}>
            Faça login para acessar o sistema
          </p>
        </div>

        {/* Alerts */}
        <div className={`alert alert-danger ${error ? "show" : ""}`} id="errorAlert" role="alert">
          {error}
        </div>

        <form id="authForm" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email" className="form-label">E-mail</label>
            <input
              type="email"
              className="form-control"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password" className="form-label">Senha</label>
            <input
              type="password"
              className="form-control"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn-login text-white"
            id="submitBtn"
            disabled={loading}
          >
            {loading ? <><span className="loading-spinner" style={{ marginRight: 8, width: 16, height: 16 }} />A entrar...</> : "Entrar"}
          </button>
        </form>

        <div className="text-center mt-3" id="toggleText" style={{ marginTop: 16, fontSize: 13, color: "#888" }}>
          Não tem uma conta? Entre em contacto com o administrador.
        </div>

        <div style={{ marginTop: 12, fontSize: 11, color: "#bbb", textAlign: "center" }}>
          Demo: admin@gmail.com / 1
        </div>
      </div>
    </div>
  );
}
