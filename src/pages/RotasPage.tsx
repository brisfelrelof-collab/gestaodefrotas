// pages/RotasPage.tsx
import { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";
import { StatusBadge, Modal, EmptyRow } from "../components/StatusBadge";
import { rotasStore } from "../store";
import type { Rota } from "../types";

const EMPTY: Partial<Rota> = {
  nomeRota: "", origem: "", destino: "", distancia: 0, tempoEstimado: "", status: "ativa",
};

interface RotasPageProps {
  onMenuToggle: () => void;
  onLogout: () => void;
}

export default function RotasPage({ onMenuToggle, onLogout }: RotasPageProps) {
  const [rotas, setRotas]       = useState<Rota[]>([]);
  const [search, setSearch]     = useState("");
  const [statusF, setStatusF]   = useState("todos");
  const [modal, setModal]       = useState(false);
  const [form, setForm]         = useState<Partial<Rota>>({ ...EMPTY });

  const reload = async () => {
    const rows = await rotasStore.getAll();
    setRotas((rows as any[]).map((r) => ({
      ...r,
      nomeRota: r.nome_rota ?? r.nomeRota ?? "",
      tempoEstimado: r.tempo_estimado ?? r.tempoEstimado ?? "",
    })));
  };
  useEffect(() => { void reload(); }, []);

  const filtered = rotas.filter((r) => {
    const m = [r.nomeRota, r.origem, r.destino].some((s) =>
      s?.toLowerCase().includes(search.toLowerCase())
    );
    const sf = statusF === "todos" || r.status === statusF;
    return m && sf;
  });

  const stats = {
    total:    rotas.length,
    ativas:   rotas.filter((r) => r.status === "ativa").length,
    maior:    rotas.length ? Math.max(...rotas.map((r) => r.distancia)) : 0,
    medio:    rotas.length ? Math.round(rotas.reduce((s,r) => s + r.distancia, 0) / rotas.length) : 0,
  };

  const openNew  = () => { setForm({ ...EMPTY }); setModal(true); };
  const openEdit = (r: Rota) => { setForm({ ...r }); setModal(true); };

  const handleDelete = (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta rota?")) return;
    rotasStore.remove(id); reload();
  };

  const exportCSV = () => {
    const rows = [
      ["Nome","Origem","Destino","Distância (km)","Tempo","Status"],
      ...filtered.map((r) => [r.nomeRota, r.origem, r.destino, r.distancia, r.tempoEstimado, r.status]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const a   = document.createElement("a");
    a.href    = URL.createObjectURL(new Blob([csv], { type:"text/csv" }));
    a.download= "rotas.csv";
    a.click();
  };

  const handleSave = () => {
    if (!form.nomeRota?.trim() || !form.origem?.trim() || !form.destino?.trim()) {
      alert("Preencha os campos obrigatórios."); return;
    }
    const data = form as Omit<Rota,"id">;
    if (form.id) rotasStore.update(form.id, data);
    else         rotasStore.add(data);
    reload(); setModal(false);
  };

  const f = (field: keyof Rota) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [field]: e.target.value }));

  return (
    <div>
      <PageHeader icon="bi-map" title="Gestão de Rotas" onMenuToggle={onMenuToggle} onLogout={onLogout} />

      {/* Stats */}
      <div className="stats-row" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))", gap:16 }}>
        {[
          { label:"Total Rotas",     value:stats.total,         icon:"bi-map",          cls:"stat-icon" },
          { label:"Rotas Ativas",    value:stats.ativas,        icon:"bi-check-circle-fill", cls:"stat-icon-success" },
          { label:"Maior Distância", value:`${stats.maior} km`, icon:"bi-arrow-right",  cls:"stat-icon-warning" },
          { label:"Tempo Médio",     value:`${stats.medio} km`, icon:"bi-clock",        cls:"stat-icon" },
        ].map((s) => (
          <div className="stat-card" key={s.label}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div><h6 className="text-muted">{s.label}</h6><h3>{s.value}</h3></div>
              <i className={`bi ${s.icon} ${s.cls}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12, marginBottom:16 }}>
        <button className="btn-primary-custom" onClick={openNew}>
          <i className="bi bi-plus-circle" /> Nova Rota
        </button>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          <div className="search-box" style={{ minWidth:220 }}>
            <i className="bi bi-search" />
            <input type="text" className="form-control" id="searchInput"
              placeholder="Buscar rota..."
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select id="statusFilter" className="form-select" style={{ width:160 }}
            value={statusF} onChange={(e) => setStatusF(e.target.value)}>
            <option value="todos">Todas</option>
            <option value="ativa">Ativas</option>
            <option value="inativa">Inativas</option>
            <option value="manutencao">Manutenção</option>
          </select>
          <button className="btn-outline-custom" onClick={exportCSV}>
            <i className="bi bi-download" /> Exportar
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <div className="table-responsive">
          <table className="table-custom">
            <thead>
              <tr>
                <th>Nome da Rota</th><th>Origem</th><th>Destino</th>
                <th>Distância (km)</th><th>Tempo</th><th>Status</th><th>Ações</th>
              </tr>
            </thead>
            <tbody id="rotasTable">
              {filtered.length === 0 ? (
                <EmptyRow cols={7} message="Nenhuma rota encontrada." />
              ) : filtered.map((r) => (
                <tr key={r.id}>
                  <td><strong>{r.nomeRota}</strong></td>
                  <td>{r.origem}</td><td>{r.destino}</td>
                  <td>{r.distancia}</td><td>{r.tempoEstimado}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td>
                    <button className="btn-action btn-edit" onClick={() => openEdit(r)}><i className="bi bi-pencil" /></button>
                    <button className="btn-action btn-delete" onClick={() => handleDelete(r.id)}><i className="bi bi-trash" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <Modal
          title={`${form.id ? "Editar" : "Cadastro de"} Rota`}
          icon="bi-map"
          large
          onClose={() => setModal(false)}
          footer={
            <>
              <button className="btn-secondary-custom" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn-primary-custom" onClick={handleSave}>Salvar</button>
            </>
          }
        >
          <form id="routeForm">
            <input type="hidden" id="routeId" value={form.id ?? ""} />
            <div className="form-group">
              <label className="form-label">Nome da Rota *</label>
              <input type="text" id="nomeRota" required className="form-control"
                placeholder="Ex: Luanda - Benguela" value={form.nomeRota ?? ""} onChange={f("nomeRota")} />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Origem *</label>
                <input type="text" id="origem" required className="form-control"
                  placeholder="Cidade / local de origem" value={form.origem ?? ""} onChange={f("origem")} />
              </div>
              <div className="form-group">
                <label className="form-label">Destino *</label>
                <input type="text" id="destino" required className="form-control"
                  placeholder="Cidade / local de destino" value={form.destino ?? ""} onChange={f("destino")} />
              </div>
            </div>
            <div className="grid-3">
              <div className="form-group">
                <label className="form-label">Distância (km)</label>
                <input type="number" id="distancia" className="form-control" min={0}
                  value={form.distancia ?? ""} onChange={f("distancia")} />
              </div>
              <div className="form-group">
                <label className="form-label">Tempo Estimado</label>
                <input type="text" id="tempoEstimado" className="form-control"
                  placeholder="Ex: 6h30" value={form.tempoEstimado ?? ""} onChange={f("tempoEstimado")} />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select id="statusRota" className="form-select" value={form.status ?? "ativa"} onChange={f("status")}>
                  <option value="ativa">Ativa</option>
                  <option value="inativa">Inativa</option>
                  <option value="manutencao">Manutenção</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Descrição</label>
              <textarea id="descricao" className="form-control" rows={2}
                placeholder="Detalhes da rota, pontos de paragem, etc."
                value={form.descricao ?? ""} onChange={f("descricao")} />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
