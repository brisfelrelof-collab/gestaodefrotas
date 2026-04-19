// src/pages/RegisterPage.tsx
import { useState } from "react";
import { supabaseRegister } from "../supabase/auth";
import { usuariosClientesStore } from "../store";

interface RegisterPageProps {
  onRegistered: () => void;
  onBack:       () => void;
}

const EMPTY = {
  nome: "", email: "", senha: "", confirmarSenha: "",
  numeroBilhete: "", numeroCartao: "", idade: "",
  genero: "" as "" | "masculino" | "feminino" | "outro",
  telefone: "",
};

export default function RegisterPage({ onRegistered, onBack }: RegisterPageProps) {
  const [form,    setForm]    = useState({ ...EMPTY });
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const f = (field: keyof typeof EMPTY) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((p) => ({ ...p, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.senha !== form.confirmarSenha) { setError("As senhas não coincidem."); return; }
    if (form.senha.length < 6)              { setError("A senha deve ter mínimo 6 caracteres."); return; }
    if (!form.genero)                       { setError("Selecione o género."); return; }

    setLoading(true);

    const result = await supabaseRegister({
      email:    form.email,
      password: form.senha,
      nome:     form.nome,
      role:     "usuario",
      extra: {
        numero_bilhete: form.numeroBilhete,
        numero_cartao:  form.numeroCartao,
        idade:          Number(form.idade),
        genero:         form.genero,
        telefone:       form.telefone,
      },
    });

    if (!result.ok) { setLoading(false); setError(result.error ?? "Erro ao criar conta."); return; }

    await usuariosClientesStore.set(result.uid!, {
      nome:           form.nome,
      email:          form.email,
      numero_bilhete: form.numeroBilhete,
      numero_cartao:  form.numeroCartao,
      idade:          Number(form.idade),
      genero:         form.genero as "masculino" | "feminino" | "outro",
      telefone:       form.telefone,
      status:         "ativo",
    });

    setLoading(false);
    onRegistered();
  };

  return (
    <div className="login-bg">
      <div className="login-card" style={{ maxWidth: 480 }}>
        <div className="login-header">
          <div style={{ width: 70, height: 70, borderRadius: "50%", background: "linear-gradient(135deg,#55a0a6,#3d7a7f)", margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="bi bi-person-plus" style={{ color: "white", fontSize: 30 }} />
          </div>
          <h2>Criar Conta</h2>
          <p style={{ color: "#999", fontSize: 13 }}>Registe-se para solicitar serviços</p>
        </div>

        {error && (
          <div className="alert alert-danger show">
            <i className="bi bi-exclamation-triangle-fill" style={{ marginRight: 8 }} />{error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nome Completo *</label>
            <input type="text" className="form-control" required value={form.nome} onChange={f("nome")} />
          </div>
          <div className="form-group">
            <label className="form-label">E-mail *</label>
            <input type="email" className="form-control" required value={form.email} onChange={f("email")} />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Nº do Bilhete *</label>
              <input type="text" className="form-control" required value={form.numeroBilhete} onChange={f("numeroBilhete")} />
            </div>
            <div className="form-group">
              <label className="form-label">Nº do Cartão</label>
              <input type="text" className="form-control" value={form.numeroCartao} onChange={f("numeroCartao")} />
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Idade *</label>
              <input type="number" className="form-control" required min={18} max={120} value={form.idade} onChange={f("idade")} />
            </div>
            <div className="form-group">
              <label className="form-label">Género *</label>
              <select className="form-select" required value={form.genero} onChange={f("genero")}>
                <option value="">Selecione</option>
                <option value="masculino">Masculino</option>
                <option value="feminino">Feminino</option>
                <option value="outro">Outro</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Telefone</label>
            <input type="tel" className="form-control" value={form.telefone} onChange={f("telefone")} />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Senha *</label>
              <input type="password" className="form-control" required minLength={6} placeholder="Mínimo 6 caracteres" value={form.senha} onChange={f("senha")} />
            </div>
            <div className="form-group">
              <label className="form-label">Confirmar Senha *</label>
              <input type="password" className="form-control" required value={form.confirmarSenha} onChange={f("confirmarSenha")} />
            </div>
          </div>

          <button type="submit" className="btn-login text-white" disabled={loading} style={{ marginTop: 8 }}>
            {loading
              ? <><span className="loading-spinner" style={{ marginRight: 8, width: 16, height: 16 }} />A registar...</>
              : "Criar Conta"}
          </button>
        </form>

        <div style={{ marginTop: 14, textAlign: "center", fontSize: 13, color: "#888" }}>
          Já tem conta?{" "}
          <button onClick={onBack} style={{ background: "none", border: "none", color: "var(--primary-color)", cursor: "pointer", fontWeight: 600 }}>
            Entrar
          </button>
        </div>
      </div>
    </div>
  );
}
