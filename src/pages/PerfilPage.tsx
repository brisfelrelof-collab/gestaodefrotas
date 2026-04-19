// src/pages/PerfilPage.tsx
import { useEffect, useRef, useState } from "react";
import PageHeader from "../components/PageHeader";
import { supabase } from "../supabase/client";
import { getUserProfile, resetPassword } from "../supabase/auth";
import { usersDB } from "../supabase/database";
import { uploadProfilePhoto, fileToBase64 } from "../supabase/storage";
import { useAuth } from "../hooks/useAuth";
import type { AppUser } from "../types";

interface Props { onMenuToggle: () => void; onLogout: () => void; }

const ROLE_LABEL: Record<string, string> = {
  superadmin:   "Super Administrador",
  proprietario: "Proprietário",
  motorista:    "Motorista",
  usuario:      "Cliente",
};

export default function PerfilPage({ onMenuToggle, onLogout }: Props) {
  const { user: authUser } = useAuth();
  const [profile,  setProfile]  = useState<AppUser | null>(null);
  const [form,     setForm]     = useState({ nome: "", telefone: "" });
  const [preview,  setPreview]  = useState<string>("");
  const [foto,     setFoto]     = useState<File | null>(null);
  const [toast,    setToast]    = useState("");
  const [saving,   setSaving]   = useState(false);
  const [uid,      setUid]      = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const userId = data.session?.user?.id ?? "";
      setUid(userId);
      if (userId) load(userId);
    });
  }, []);

  const load = async (userId: string) => {
    const p = await getUserProfile(userId);
    setProfile(p);
    setForm({ nome: p?.nome ?? "", telefone: p?.telefone ?? "" });
    setPreview(p?.foto_url ?? "");
  };

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const handleFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFoto(file);
    setPreview(await fileToBase64(file));
  };

  const handleSave = async () => {
    if (!form.nome.trim()) { alert("O nome não pode estar vazio."); return; }
    setSaving(true);
    try {
      let foto_url = profile?.foto_url ?? "";
      const role = profile?.role;

      if (foto && uid && (role === "proprietario" || role === "motorista")) {
        const storageRole = role === "proprietario" ? "proprietarios" : "motoristas";
        const up = await uploadProfilePhoto(uid, storageRole, foto);
        if (up.ok) foto_url = up.url!;
      }

      await usersDB.update(uid, { nome: form.nome, telefone: form.telefone, foto_url });
      await load(uid);
      showToast("Perfil actualizado com sucesso!");
    } finally {
      setSaving(false);
    }
  };

  const handleResetSenha = async () => {
    if (!profile?.email) return;
    if (!confirm(`Enviar email de reset de senha para ${profile.email}?`)) return;
    const r = await resetPassword(profile.email);
    showToast(r.ok ? "Email de reset enviado!" : r.error ?? "Erro.");
  };

  if (!profile) return (
    <div>
      <PageHeader icon="bi-person" title="Meu Perfil" onMenuToggle={onMenuToggle} onLogout={onLogout} />
      <div style={{ textAlign: "center", padding: 48 }}><span className="loading-spinner" /></div>
    </div>
  );

  return (
    <div>
      <PageHeader icon="bi-person" title="Meu Perfil" onMenuToggle={onMenuToggle} onLogout={onLogout} />

      {toast && (
        <div className="alert alert-success show" style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <i className="bi bi-check-circle-fill" /> {toast}
        </div>
      )}

      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <div className="card-box">
          {/* Avatar */}
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div onClick={() => fileRef.current?.click()}
              style={{ width: 100, height: 100, borderRadius: "50%", cursor: "pointer", background: "#f0f4f5", border: "3px solid var(--primary-color)", display: "inline-flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              {preview
                ? <img src={preview} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="Foto" />
                : <i className="bi bi-person" style={{ fontSize: 48, color: "#ccc" }} />
              }
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFoto} />
            {(profile.role === "proprietario" || profile.role === "motorista") && (
              <div style={{ fontSize: 12, color: "#888", marginTop: 6 }}>Clique para alterar a foto</div>
            )}
            <div style={{ marginTop: 8 }}>
              <span style={{ fontSize: 12, padding: "3px 12px", borderRadius: 20, fontWeight: 600, background: "linear-gradient(135deg,#55a0a6,#3d7a7f)", color: "white" }}>
                {ROLE_LABEL[profile.role] ?? profile.role}
              </span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" className="form-control" value={profile.email} disabled style={{ background: "#f8f9fa", cursor: "not-allowed" }} />
            <small style={{ color: "#aaa", fontSize: 11 }}>O email não pode ser alterado aqui.</small>
          </div>

          <div className="form-group">
            <label className="form-label">Nome Completo *</label>
            <input type="text" className="form-control" value={form.nome}
              onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))} />
          </div>

          <div className="form-group">
            <label className="form-label">Telefone</label>
            <input type="tel" className="form-control" value={form.telefone}
              onChange={(e) => setForm((p) => ({ ...p, telefone: e.target.value }))} />
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
            <button className="btn-primary-custom" onClick={handleSave} disabled={saving} style={{ flex: 1 }}>
              {saving
                ? <><span className="loading-spinner" style={{ width: 14, height: 14, marginRight: 6 }} />A guardar...</>
                : <><i className="bi bi-floppy" style={{ marginRight: 6 }} />Guardar Alterações</>}
            </button>
            <button className="btn-secondary-custom" onClick={handleResetSenha}>
              <i className="bi bi-key" style={{ marginRight: 6 }} />Alterar Senha
            </button>
          </div>
        </div>

        <div className="card-box" style={{ marginTop: 16 }}>
          <h6 style={{ color: "#888", marginBottom: 12 }}>Informações da Conta</h6>
          {[
            { label: "ID",           value: profile.id },
            { label: "Tipo de Conta",value: ROLE_LABEL[profile.role] ?? profile.role },
            { label: "Status",       value: profile.status ?? "ativo" },
          ].map((row) => (
            <div key={row.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, padding: "8px 0", borderBottom: "1px solid #f5f5f5" }}>
              <span style={{ color: "#888" }}>{row.label}</span>
              <span style={{ fontWeight: 600, color: "#333", wordBreak: "break-all", textAlign: "right", maxWidth: "60%" }}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
