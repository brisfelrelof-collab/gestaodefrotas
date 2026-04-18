// pages/UtilizadoresPage.tsx
import { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";
import { StatusBadge, Modal, EmptyRow } from "../components/StatusBadge";
import { utilizadoresStore } from "../store";
import type { AppUser } from "../types";

const EMPTY: Omit<AppUser,"uid"> = {
  email:"", nome:"", cargo:"operador", status:"ativo",
};

interface UtilizadoresPageProps {
  onMenuToggle: () => void;
  onLogout: () => void;
}

export default function UtilizadoresPage({ onMenuToggle, onLogout }: UtilizadoresPageProps) {
  const [users,  setUsers]  = useState<AppUser[]>([]);
  const [modal,  setModal]  = useState(false);
  const [form,   setForm]   = useState<Partial<AppUser & { senha?: string }>>({ ...EMPTY });
  const [toast,  setToast]  = useState("");

  const reload = () => setUsers(utilizadoresStore.getAll());
  useEffect(() => { reload(); }, []);

  const stats = {
    total:        users.length,
    admins:       users.filter((u) => u.cargo === "admin").length,
    operadores:   users.filter((u) => u.cargo === "operador").length,
    inativos:     users.filter((u) => u.status === "inativo").length,
  };

  const openNew  = () => { setForm({ ...EMPTY }); setModal(true); };
  const openEdit = (u: AppUser) => { setForm({ ...u }); setModal(true); };

  const handleDelete = (id: string) => {
    if (!confirm("Excluir este utilizador?")) return;
    utilizadoresStore.remove(id); reload();
  };

  const handleResetSenha = (u: AppUser) => {
    if (!confirm(`Enviar email de reset de senha para ${u.nome ?? u.email}?`)) return;
    showToast(`Email de reset enviado para ${u.email}`);
  };

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  const handleSave = () => {
    if (!form.nome?.trim())   { alert("Nome é obrigatório!"); return; }
    if (!form.email?.trim())  { alert("Email é obrigatório!"); return; }
    if (!form.uid && !form.senha?.trim()) { alert("Senha é obrigatória para novo utilizador!"); return; }
    if (!form.uid && (form.senha?.length ?? 0) < 6) { alert("Senha deve ter mínimo 6 caracteres!"); return; }

    if (!form.uid && utilizadoresStore.exists("email" as any, form.email)) {
      alert("Já existe um utilizador com este email!"); return;
    }

    const data: Omit<AppUser,"uid"> = {
      email:  form.email!,
      nome:   form.nome!,
      cargo:  form.cargo  ?? "operador",
      status: form.status ?? "ativo",
      telefone: form.telefone,
    };

    if (form.uid) {
      utilizadoresStore.update(form.uid, data);
    } else {
      // store with password in app_users
      const appUsers: any[] = JSON.parse(localStorage.getItem("app_users") ?? "[]");
      const uid = "u" + Date.now();
      appUsers.push({ uid, email: form.email, password: form.senha, nome: form.nome, cargo: form.cargo, createdAt: new Date().toISOString() });
      localStorage.setItem("app_users", JSON.stringify(appUsers));
      utilizadoresStore.add({ ...data, uid } as any);
    }
    reload(); setModal(false);
    showToast(form.uid ? "Utilizador atualizado!" : "Utilizador criado!");
  };

  const f = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [field]: e.target.value }));

  return (
    <div>
      <PageHeader icon="bi-people" title="Gestão de Utilizadores" onMenuToggle={onMenuToggle} onLogout={onLogout} />

      {/* Toast */}
      {toast && (
        <div className="alert alert-success show" style={{ marginBottom:16, display:"flex", alignItems:"center", gap:8 }}>
          <i className="bi bi-check-circle-fill" /> {toast}
        </div>
      )}

      {/* Stats */}
      <div className="stats-row" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:16 }}>
        {[
          { label:"Total Utilizadores", value:stats.total },
          { label:"Administradores",    value:stats.admins },
          { label:"Operadores",         value:stats.operadores },
          { label:"Inativos",           value:stats.inativos },
        ].map((s) => (
          <div className="stat-card" key={s.label}>
            <h6 className="text-muted">{s.label}</h6>
            <h3>{s.value}</h3>
          </div>
        ))}
      </div>

      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:16 }}>
        <button className="btn-primary-custom" onClick={openNew}>
          <i className="bi bi-person-plus" /> Novo Utilizador
        </button>
      </div>

      {/* Table */}
      <div className="table-container">
        <div className="table-responsive">
          <table className="table-custom">
            <thead>
              <tr><th>Nome</th><th>Email</th><th>Telefone</th><th>Cargo</th><th>Status</th><th>Ações</th></tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <EmptyRow cols={6} message="Nenhum utilizador encontrado." />
              ) : users.map((u) => (
                <tr key={u.uid}>
                  <td><strong>{u.nome ?? "—"}</strong></td>
                  <td style={{ color:"var(--primary-color)" }}>{u.email}</td>
                  <td>{u.telefone ?? "—"}</td>
                  <td><StatusBadge status={u.cargo ?? "operador"} /></td>
                  <td><StatusBadge status={u.status ?? "ativo"} /></td>
                  <td>
                    <button className="btn-action btn-edit"     onClick={() => openEdit(u)}><i className="bi bi-pencil" /></button>
                    <button className="btn-action btn-reset-pw" onClick={() => handleResetSenha(u)} title="Resetar senha"><i className="bi bi-envelope-paper" /></button>
                    <button className="btn-action btn-delete"   onClick={() => handleDelete(u.uid)}><i className="bi bi-trash" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Utilizador */}
      {modal && (
        <Modal
          title={`${form.uid ? "Editar" : "Novo"} Utilizador`}
          icon="bi-person-plus"
          onClose={() => setModal(false)}
          footer={
            <>
              <button className="btn-secondary-custom" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn-primary-custom" id="salvarUtilizadorBtn" onClick={handleSave}>Salvar</button>
            </>
          }
        >
          <form id="formUtilizador">
            <input type="hidden" id="userId" value={form.uid ?? ""} />

            <div className="form-group">
              <label className="form-label">Nome Completo *</label>
              <input type="text" id="nome" required className="form-control" value={form.nome ?? ""} onChange={f("nome")} />
            </div>
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input type="email" id="email" required className="form-control" value={form.email ?? ""} onChange={f("email")} />
            </div>
            <div className="form-group">
              <label className="form-label">Telefone</label>
              <input type="tel" id="telefone" className="form-control" value={form.telefone ?? ""} onChange={f("telefone")} />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Cargo</label>
                <select id="cargo" className="form-select" value={form.cargo ?? "operador"} onChange={f("cargo")}>
                  <option value="operador">Operador</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select id="status" className="form-select" value={form.status ?? "ativo"} onChange={f("status")}>
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </div>
            </div>

            <div className="form-group" id="senhaField">
              <label className="form-label">
                Senha {!form.uid ? "*" : ""}
              </label>
              <input type="password" id="senha" className="form-control"
                placeholder={form.uid ? "Deixe em branco para manter" : "Mínimo 6 caracteres"}
                value={(form as any).senha ?? ""} onChange={f("senha")} />
              <small style={{ fontSize:11, color:"#888" }}>
                Mínimo 6 caracteres.{form.uid ? " Deixe em branco para manter a senha actual." : ""}
              </small>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
