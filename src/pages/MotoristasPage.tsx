// src/pages/MotoristasPage.tsx
// ─── Gestão de Motoristas (updated — async Firebase + viatura assignment) ────────

import { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";
import { StatusBadge, Modal, EmptyRow } from "../components/StatusBadge";
import { motoristasStore, veiculosStore } from "../store";
import type { Motorista, Viatura } from "../types";

const CATEGORIAS = ["A", "B", "C", "D", "E"] as const;
const PROVINCIAS = [
  "Bengo","Benguela","Bié","Cabinda","Cuando Cubango","Cuanza Norte",
  "Cuanza Sul","Cunene","Huambo","Huíla","Luanda","Lunda Norte",
  "Lunda Sul","Malanje","Moxico","Namibe","Uíge","Zaire",
];

const EMPTY: Partial<Motorista> = {
  nome: "",
  bi: "",
  cartaConducao: "",
  categoriaCarta: "B",
  telefone: "",
  dataNascimento: "",
  provincia: "",
  status: "ativo",
};

interface Props { onMenuToggle: () => void; onLogout: () => void; }

export default function MotoristasPage({ onMenuToggle, onLogout }: Props) {
  const [motoristas, setMotoristas] = useState<(Motorista & { id: string })[]>([]);
  const [viaturas,   setViaturas]   = useState<(Viatura & { id: string })[]>([]);
  const [search,     setSearch]     = useState("");
  const [modal,      setModal]      = useState(false);
  const [atribModal, setAtribModal] = useState(false);
  const [form,       setForm]       = useState<Partial<Motorista>>({ ...EMPTY });
  const [atribForm,  setAtribForm]  = useState<{ motoristaId: string; viaturaId: string }>({ motoristaId: "", viaturaId: "" });
  const [loading,    setLoading]    = useState(false);
  const [saving,     setSaving]     = useState(false);

  const reload = async () => {
    setLoading(true);
    const [m, v] = await Promise.all([motoristasStore.getAll(), veiculosStore.getAll()]);
    setMotoristas(m);
    setViaturas(v);
    setLoading(false);
  };
  useEffect(() => { reload(); }, []);

  const filtered = motoristas.filter((m) =>
    [m.nome, m.bi, m.cartaConducao, m.telefone, m.email, m.provincia].some((f) =>
      f?.toLowerCase().includes(search.toLowerCase())
    )
  );

  const getViaturaInfo = (viaturaId?: string) => {
    if (!viaturaId) return null;
    return viaturas.find((v) => v.id === viaturaId);
  };

  const openNew  = () => { setForm({ ...EMPTY }); setModal(true); };
  const openEdit = (m: Motorista) => { setForm({ ...m }); setModal(true); };

  const openAtrib = (m: Motorista) => {
    setAtribForm({ motoristaId: m.id, viaturaId: m.viaturaAtribuidaId ?? "" });
    setAtribModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este motorista?")) return;
    await motoristasStore.remove(id);
    reload();
  };

  const handleSave = async () => {
    const { nome, bi, cartaConducao, categoriaCarta, telefone, dataNascimento, provincia } = form;
    if (!nome || !bi || !cartaConducao || !telefone || !dataNascimento || !provincia) {
      alert("Preencha todos os campos obrigatórios."); return;
    }
    setSaving(true);
    try {
      if (form.id) {
        const { id, ...data } = form as Motorista;
        if (await motoristasStore.exists("bi", bi, id)) { alert("BI já cadastrado."); return; }
        await motoristasStore.update(id, data);
      } else {
        if (await motoristasStore.exists("bi", bi)) { alert("BI já cadastrado."); return; }
        await motoristasStore.add(form as Omit<Motorista, "id">);
      }
      await reload();
      setModal(false);
    } finally {
      setSaving(false);
    }
  };

  const handleAtribuir = async () => {
    if (!atribForm.motoristaId) return;
    setSaving(true);
    try {
      await motoristasStore.update(atribForm.motoristaId, {
        viaturaAtribuidaId: atribForm.viaturaId || undefined,
      });
      // Update viatura status
      if (atribForm.viaturaId) {
        await veiculosStore.update(atribForm.viaturaId, { status: "ocupada" });
      }
      await reload();
      setAtribModal(false);
    } finally {
      setSaving(false);
    }
  };

  const f = (field: keyof Motorista) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [field]: e.target.value }));

  return (
    <div>
      <PageHeader icon="bi-person-badge" title="Gestão de Motoristas" onMenuToggle={onMenuToggle} onLogout={onLogout} />

      {/* Toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div className="search-box" style={{ flex: 1, minWidth: 220 }}>
          <i className="bi bi-search" />
          <input type="text" className="form-control"
            placeholder="Buscar por nome, BI, carta de condução, telefone..."
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button className="btn-primary-custom" onClick={openNew}>
          <i className="bi bi-person-plus" /> Novo Motorista
        </button>
      </div>

      {/* Stats */}
      <div className="stats-row" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 16, marginBottom: 20 }}>
        {[
          { label: "Total",    value: motoristas.length },
          { label: "Activos",  value: motoristas.filter((m) => m.status === "ativo").length },
          { label: "Inativos", value: motoristas.filter((m) => m.status === "inativo").length },
          { label: "Com Viatura", value: motoristas.filter((m) => m.viaturaAtribuidaId).length },
        ].map((s) => (
          <div className="stat-card" key={s.label}><h6 className="text-muted">{s.label}</h6><h3>{s.value}</h3></div>
        ))}
      </div>

      {/* Table */}
      <div className="table-container">
        <div className="table-responsive">
          <table className="table-custom">
            <thead>
              <tr>
                <th>Nome</th><th>BI</th><th>Carta</th><th>Categoria</th>
                <th>Telefone</th><th>Província</th><th>Viatura</th>
                <th>Status</th><th style={{ width: 120 }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ textAlign: "center", padding: 24 }}><span className="loading-spinner" /></td></tr>
              ) : filtered.length === 0 ? (
                <EmptyRow cols={9} message="Nenhum motorista cadastrado." />
              ) : filtered.map((m) => {
                const viatura = getViaturaInfo(m.viaturaAtribuidaId);
                return (
                  <tr key={m.id}>
                    <td><strong>{m.nome}</strong></td>
                    <td><code style={{ fontSize: 12 }}>{m.bi}</code></td>
                    <td><code style={{ fontSize: 12 }}>{m.cartaConducao}</code></td>
                    <td><span style={{ fontWeight: 700, color: "var(--primary-color)" }}>{m.categoriaCarta}</span></td>
                    <td>{m.telefone}</td>
                    <td>{m.provincia}</td>
                    <td>
                      {viatura
                        ? <small style={{ color: "var(--primary-color)" }}><i className="bi bi-car-front" style={{ marginRight: 4 }} />{viatura.placa}</small>
                        : <small style={{ color: "#ccc" }}>—</small>
                      }
                    </td>
                    <td><StatusBadge status={m.status} /></td>
                    <td>
                      <button className="btn-action btn-edit" onClick={() => openEdit(m)} title="Editar"><i className="bi bi-pencil" /></button>
                      <button className="btn-action" onClick={() => openAtrib(m)} title="Atribuir viatura"
                        style={{ background: "#e3f2fd", color: "#1565c0", border: "none", borderRadius: 6, padding: "4px 8px", cursor: "pointer", marginRight: 4 }}>
                        <i className="bi bi-car-front" />
                      </button>
                      <button className="btn-action btn-delete" onClick={() => handleDelete(m.id)} title="Eliminar"><i className="bi bi-trash" /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal — Edit/Create */}
      {modal && (
        <Modal title={`${form.id ? "Editar" : "Novo"} Motorista`} icon="bi-person-badge"
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
            <div className="form-group">
              <label className="form-label">Nome Completo *</label>
              <input type="text" required className="form-control" value={form.nome ?? ""} onChange={f("nome")} />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Nº do BI *</label>
                <input type="text" required className="form-control" value={form.bi ?? ""} onChange={f("bi")} />
              </div>
              <div className="form-group">
                <label className="form-label">Data de Nascimento *</label>
                <input type="date" required className="form-control" value={form.dataNascimento ?? ""} onChange={f("dataNascimento")} />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Carta de Condução *</label>
                <input type="text" required className="form-control" value={form.cartaConducao ?? ""} onChange={f("cartaConducao")} />
              </div>
              <div className="form-group">
                <label className="form-label">Categoria *</label>
                <select required className="form-select" value={form.categoriaCarta ?? "B"} onChange={f("categoriaCarta")}>
                  {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Validade da Carta</label>
                <input type="date" className="form-control" value={form.validadeCarta ?? ""} onChange={f("validadeCarta")} />
              </div>
              <div className="form-group">
                <label className="form-label">Telefone *</label>
                <input type="tel" required className="form-control" value={form.telefone ?? ""} onChange={f("telefone")} />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Telefone Alternativo</label>
                <input type="tel" className="form-control" value={form.telefoneAlternativo ?? ""} onChange={f("telefoneAlternativo")} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="email" className="form-control" value={form.email ?? ""} onChange={f("email")} />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Província *</label>
                <select required className="form-select" value={form.provincia ?? ""} onChange={f("provincia")}>
                  <option value="">Selecione</option>
                  {PROVINCIAS.map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Município</label>
                <input type="text" className="form-control" value={form.municipio ?? ""} onChange={f("municipio")} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Endereço</label>
              <input type="text" className="form-control" value={form.endereco ?? ""} onChange={f("endereco")} />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status ?? "ativo"} onChange={f("status")}>
                <option value="ativo">Activo</option>
                <option value="inativo">Inactivo</option>
                <option value="ferias">De Férias</option>
                <option value="licenca">De Licença</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Observações</label>
              <textarea className="form-control" rows={2} value={form.observacoes ?? ""} onChange={f("observacoes")} />
            </div>
          </form>
        </Modal>
      )}

      {/* Modal — Atribuir Viatura */}
      {atribModal && (
        <Modal title="Atribuir Viatura ao Motorista" icon="bi-car-front"
          onClose={() => setAtribModal(false)}
          footer={
            <>
              <button className="btn-secondary-custom" onClick={() => setAtribModal(false)}>Cancelar</button>
              <button className="btn-primary-custom" onClick={handleAtribuir} disabled={saving}>
                {saving ? "A guardar..." : "Atribuir"}
              </button>
            </>
          }
        >
          <div style={{ marginBottom: 16, color: "#666" }}>
            <i className="bi bi-info-circle" style={{ marginRight: 6 }} />
            Selecione a viatura a atribuir a este motorista. Deixe em branco para remover a atribuição.
          </div>
          <div className="form-group">
            <label className="form-label">Viatura</label>
            <select className="form-select" value={atribForm.viaturaId}
              onChange={(e) => setAtribForm((p) => ({ ...p, viaturaId: e.target.value }))}>
              <option value="">— Sem viatura atribuída —</option>
              {viaturas
                .filter((v) => v.status === "disponivel" || v.id === atribForm.viaturaId)
                .map((v) => (
                  <option key={v.id} value={v.id}>{v.marca} {v.modelo} — {v.placa} ({v.status})</option>
                ))}
            </select>
          </div>
        </Modal>
      )}
    </div>
  );
}
