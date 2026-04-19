// src/pages/ProprietariosPage.tsx  —  versão Neon PostgreSQL
// Novidade: contagem de viaturas vai directamente à tabela `viaturas` do DB

import { useEffect, useRef, useState } from "react";
import PageHeader from "../components/PageHeader";
import { StatusBadge, Modal, EmptyRow } from "../components/StatusBadge";
import { proprietariosStore, veiculosStore } from "../store";
import { supabaseRegister, resetPassword } from "../db/auth";
import type { Proprietario } from "../types";

interface Props { onMenuToggle: () => void; onLogout: () => void; }

const EMPTY: Omit<Proprietario, "id"> = {
  nome: "", nif: "", email: "", contacto: "", morada: "", status: "ativo",
};

// Converte File para base64 (preview local)
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export default function ProprietariosPage({ onMenuToggle, onLogout }: Props) {
  const [lista,   setLista]   = useState<(Proprietario & { id: string; vehicleCount?: number })[]>([]);
  const [search,  setSearch]  = useState("");
  const [modal,   setModal]   = useState(false);
  const [form,    setForm]    = useState<Partial<Proprietario & { senha?: string }>>({ ...EMPTY });
  const [foto,    setFoto]    = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [toast,   setToast]   = useState("");
  const [loading, setLoading] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reload = async () => {
    setLoading(true);
    const [props, viaturas] = await Promise.all([
      proprietariosStore.getAll(),
      veiculosStore.getAll(),
    ]);

    // Conta viaturas por proprietário usando a relação proprietario_id
    const enriched = props.map((p: Proprietario & { id: string }) => ({
      ...p,
      vehicleCount: viaturas.filter(
        (v: import("../types").Viatura & { id: string }) => v.proprietario_id === p.id || (v as any).proprietarioId === p.id
      ).length,
    }));

    setLista(enriched as any);
    setLoading(false);
  };

  useEffect(() => { reload(); }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3500); };

  const filtered = lista.filter((p) =>
    [p.nome, p.nif, p.email, p.contacto, p.morada].some((v) =>
      v?.toLowerCase().includes(search.toLowerCase())
    )
  );

  const openNew  = () => { setForm({ ...EMPTY }); setFoto(null); setPreview(""); setModal(true); };
  const openEdit = (p: Proprietario) => { setForm({ ...p }); setFoto(null); setPreview(p.foto_url ?? ""); setModal(true); };

  const handleFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFoto(file);
    setPreview(await fileToBase64(file));
  };

  const handleDelete = async (p: Proprietario) => {
    if (!confirm(`Eliminar proprietário "${p.nome}"?\nEsta acção é irreversível.`)) return;
    await proprietariosStore.remove(p.id);
    reload();
    showToast("Proprietário eliminado.");
  };

  const handleResetSenha = async (p: Proprietario) => {
    if (!confirm(`Enviar email de reset de senha para ${p.email}?`)) return;
    const result = await resetPassword(p.email);
    showToast(result.ok ? `Reset solicitado para ${p.email}` : result.error ?? "Erro ao processar reset.");
  };

  const handleSave = async () => {
    const { nome, nif, email, contacto, morada } = form;
    if (!nome || !nif || !email || !contacto || !morada) {
      alert("Preencha todos os campos obrigatórios."); return;
    }
    if (!form.id && !form.senha?.trim()) {
      alert("A senha é obrigatória para novo proprietário."); return;
    }
    if (!form.id && (form.senha?.length ?? 0) < 6) {
      alert("A senha deve ter mínimo 6 caracteres."); return;
    }

    setSaving(true);
    try {
      let uid      = form.id ?? "";
      let foto_url = form.foto_url ?? "";

      if (!form.id) {
        const reg = await supabaseRegister({
          email:    email!,
          password: form.senha!,
          nome:     nome!,
          role:     "proprietario",
          extra:    { contacto, morada, nif },
        });
        if (!reg.ok) { alert(reg.error); setSaving(false); return; }
        uid = reg.uid!;
      }

      // Upload foto (base64 simples — sem storage externo)
      if (foto && uid) {
        foto_url = await fileToBase64(foto);
      }

      const data: Omit<Proprietario, "id"> = {
        nome:     nome!,
        nif:      nif!,
        email:    email!,
        contacto: contacto!,
        morada:   morada!,
        status:   (form.status ?? "ativo") as "ativo" | "inativo",
        foto_url,
      };

      if (form.id) {
        await proprietariosStore.update(form.id, data);
      } else {
        await proprietariosStore.set(uid, data);
      }

      await reload();
      setModal(false);
      showToast(form.id ? "Proprietário actualizado!" : "Proprietário criado com sucesso!");
    } catch (err: any) {
      alert("Erro: " + (err.message ?? err));
    } finally {
      setSaving(false);
    }
  };

  const f = (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [field]: e.target.value }));

  return (
    <div>
      <PageHeader icon="bi-person-vcard" title="Gestão de Proprietários" onMenuToggle={onMenuToggle} onLogout={onLogout} />

      {toast && (
        <div className="alert alert-success show" style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <i className="bi bi-check-circle-fill" /> {toast}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div className="search-box" style={{ flex: 1, minWidth: 220 }}>
          <i className="bi bi-search" />
          <input type="text" className="form-control" placeholder="Buscar por nome, NIF, email, contacto..."
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button className="btn-primary-custom" onClick={openNew}>
          <i className="bi bi-person-plus" /> Novo Proprietário
        </button>
      </div>

      {/* Estatísticas */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 16, marginBottom: 20 }}>
        {[
          { label: "Total",           value: lista.length },
          { label: "Activos",         value: lista.filter((p) => p.status === "ativo").length },
          { label: "Inativos",        value: lista.filter((p) => p.status === "inativo").length },
          { label: "Total viaturas",  value: lista.reduce((acc, p) => acc + (p.vehicleCount ?? 0), 0) },
        ].map((s) => (
          <div className="stat-card" key={s.label}><h6 className="text-muted">{s.label}</h6><h3>{s.value}</h3></div>
        ))}
      </div>

      <div className="table-container">
        <div className="table-responsive">
          <table className="table-custom">
            <thead>
              <tr>
                <th>Foto</th>
                <th>Nome</th>
                <th>NIF / Bilhete</th>
                <th>Email</th>
                <th>Contacto</th>
                <th>Morada</th>
                <th title="Nº de viaturas registadas na frota">🚗 Viaturas</th>
                <th>Status</th>
                <th style={{ width: 140 }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ textAlign: "center", padding: 24 }}><span className="loading-spinner" /></td></tr>
              ) : filtered.length === 0 ? (
                <EmptyRow cols={9} message="Nenhum proprietário cadastrado." />
              ) : filtered.map((p) => (
                <tr key={p.id}>
                  <td>
                    {p.foto_url
                      ? <img src={p.foto_url} alt={p.nome} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
                      : <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#e9ecef", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <i className="bi bi-person" style={{ color: "#aaa" }} />
                        </div>
                    }
                  </td>
                  <td><strong>{p.nome}</strong></td>
                  <td><code style={{ fontSize: 12 }}>{p.nif}</code></td>
                  <td style={{ color: "var(--primary-color)" }}>{p.email}</td>
                  <td>{p.contacto}</td>
                  <td><small>{p.morada}</small></td>
                  <td style={{ textAlign: "center" }}>
                    <span style={{
                      background: (p.vehicleCount ?? 0) > 0 ? "#e8f5e9" : "#f5f5f5",
                      color:      (p.vehicleCount ?? 0) > 0 ? "#2e7d32" : "#9e9e9e",
                      padding:    "3px 10px",
                      borderRadius: 12,
                      fontSize: 13,
                      fontWeight: 700,
                    }}>
                      <i className="bi bi-truck" style={{ marginRight: 4 }} />
                      {p.vehicleCount ?? 0}
                    </span>
                  </td>
                  <td><StatusBadge status={p.status} /></td>
                  <td>
                    <button className="btn-action btn-edit"     onClick={() => openEdit(p)}         title="Editar"><i className="bi bi-pencil" /></button>
                    <button className="btn-action btn-reset-pw" onClick={() => handleResetSenha(p)} title="Reset senha"><i className="bi bi-envelope-paper" /></button>
                    <button className="btn-action btn-delete"   onClick={() => handleDelete(p)}     title="Eliminar"><i className="bi bi-trash" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <Modal
          title={`${form.id ? "Editar" : "Novo"} Proprietário`}
          icon="bi-person-vcard"
          onClose={() => setModal(false)}
          footer={
            <>
              <button className="btn-secondary-custom" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn-primary-custom" onClick={handleSave} disabled={saving}>
                {saving ? <><span className="loading-spinner" style={{ width: 14, height: 14, marginRight: 6 }} />A guardar...</> : "Guardar"}
              </button>
            </>
          }
        >
          <form>
            <div className="form-group" style={{ textAlign: "center" }}>
              <div onClick={() => fileRef.current?.click()}
                style={{ width: 90, height: 90, borderRadius: "50%", cursor: "pointer", background: "#f0f4f5", border: "2px dashed #55a0a6", display: "inline-flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                {preview
                  ? <img src={preview} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <div style={{ textAlign: "center", color: "#aaa" }}>
                      <i className="bi bi-camera" style={{ fontSize: 24, display: "block" }} />
                      <small style={{ fontSize: 10 }}>Foto</small>
                    </div>
                }
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFoto} />
              <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>Clique para selecionar (opcional)</div>
            </div>

            <div className="form-group">
              <label className="form-label">Nome Completo *</label>
              <input type="text" className="form-control" required value={form.nome ?? ""} onChange={f("nome")} />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">NIF ou Nº do Bilhete *</label>
                <input type="text" className="form-control" required value={form.nif ?? ""} onChange={f("nif")} />
              </div>
              <div className="form-group">
                <label className="form-label">Contacto *</label>
                <input type="tel" className="form-control" required value={form.contacto ?? ""} onChange={f("contacto")} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input type="email" className="form-control" required value={form.email ?? ""} onChange={f("email")} disabled={!!form.id} />
              {form.id && <small style={{ color: "#aaa", fontSize: 11 }}>O email não pode ser alterado após criação.</small>}
            </div>
            {!form.id && (
              <div className="form-group">
                <label className="form-label">Senha *</label>
                <input type="password" className="form-control" required minLength={6}
                  placeholder="Mínimo 6 caracteres" value={(form as any).senha ?? ""} onChange={f("senha")} />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Morada *</label>
              <textarea className="form-control" rows={2} required value={form.morada ?? ""} onChange={f("morada")} />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status ?? "ativo"} onChange={f("status")}>
                <option value="ativo">Activo</option>
                <option value="inativo">Inactivo</option>
              </select>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
