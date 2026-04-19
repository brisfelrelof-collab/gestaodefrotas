// pages/AlugueresPage.tsx
import { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";
import { StatusBadge, Modal, EmptyRow } from "../components/StatusBadge";
import { alugueresStore, veiculosStore, motoristasStore, rotasStore } from "../store";
import type { Aluguer, Viatura, Motorista, Rota } from "../types";

const EMPTY: Partial<Aluguer> = {
  clienteNome: "",
  cliente_contato: "",
  // Aluguer (legacy) reuses fields from Servico; include required legacy fields
  viaturaId: "",
  proprietarioId: "",
  usuarioId: "",
  dataInicio: "",
  dataFimPrevista: "",
  valor_diaria: 0,
  valorTotal: 0,
  valorProprietario: 0,
  valorSistema: 0,
  status: "em_andamento",
};

interface AlugueresPageProps {
  onMenuToggle: () => void;
  onLogout: () => void;
}

export default function AlugueresPage({ onMenuToggle, onLogout }: AlugueresPageProps) {
  const [alugueres, setAlugueres] = useState<Aluguer[]>([]);
  const [veiculos,  setVeiculos]  = useState<Viatura[]>([]);
  const [motoristas,setMotoristas]= useState<Motorista[]>([]);
  const [rotas,     setRotas]     = useState<Rota[]>([]);

  const [search,  setSearch]  = useState("");
  const [statusF, setStatusF] = useState("todos");
  const [modal,   setModal]   = useState(false);
  const [form,    setForm]    = useState<Partial<Aluguer>>({ ...EMPTY });

  const reload = async () => {
    const [als, vs, ms, rs] = await Promise.all([
      alugueresStore.getAll(),
      veiculosStore.getAll(),
      motoristasStore.getAll(),
      rotasStore.getAll(),
    ]);
    setAlugueres(als.sort((a: Aluguer, b: Aluguer) => (b.dataInicio ?? "").localeCompare(a.dataInicio ?? "")));
    setVeiculos(vs as Viatura[]);
    setMotoristas(ms as Motorista[]);
    setRotas(rs as Rota[]);
  };
  useEffect(() => { void reload(); }, []);

  // lookup helpers
  const veiculoLabel = (id?: string) => {
    if (!id) return "—";
    const v = veiculos.find((x) => x.id === id);
    return v ? `${v.marca} ${v.modelo} (${v.placa})` : id;
  };
  const motoristaLabel = (id?: string) => motoristas.find((m) => m.id === id)?.nome ?? id ?? "—";
  const rotaLabel      = (id?: string) => rotas.find((r) => r.id === id)?.nomeRota ?? id ?? "—";

  const filtered = alugueres.filter((a) => {
    const m = [a.clienteNome, veiculoLabel(a.viaturaId), motoristaLabel(a.motoristaId)].some((s) =>
      (s ?? "").toLowerCase().includes(search.toLowerCase())
    );
    const sf = statusF === "todos" || a.status === statusF;
    return m && sf;
  });

  const openNew  = () => { setForm({ ...EMPTY }); setModal(true); };
  const openEdit = (a: Aluguer) => { setForm({ ...a }); setModal(true); };

  const handleDelete = (id: string) => {
    if (!confirm("Excluir este aluguer?")) return;
    alugueresStore.remove(id); reload();
  };

  const exportCSV = () => {
    const rows = [
      ["Cliente","Veículo","Motorista","Rota","Início","Fim Previsto","Valor (Kz)","Status"],
      ...filtered.map((a) => [
        a.clienteNome, veiculoLabel(a.viaturaId), motoristaLabel(a.motoristaId),
        rotaLabel(a.rota_id), a.dataInicio, a.dataFimPrevista, a.valorTotal, a.status,
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type:"text/csv" }));
    link.download = "alugueres.csv"; link.click();
  };

  const handleSave = () => {
    if (!form.clienteNome?.trim()) { alert("Nome do cliente é obrigatório!"); return; }
    if (!form.viaturaId)           { alert("Selecione um veículo!");           return; }
    if (!form.dataInicio)          { alert("Data de início é obrigatória!");   return; }
    if (!form.dataFimPrevista)     { alert("Data de fim é obrigatória!");      return; }

    const data = form as Omit<Aluguer,"id">;
    if (form.id) alugueresStore.update(form.id, data);
    else         alugueresStore.add(data);
    reload(); setModal(false);
  };

  const f = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [field]: e.target.value }));

  return (
    <div>
      <PageHeader icon="bi-calendar-check" title="Gestão de Alugueres" onMenuToggle={onMenuToggle} onLogout={onLogout} />

      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:16 }}>
        <button className="btn-primary-custom" id="novoAluguerBtn" onClick={openNew}>
          <i className="bi bi-plus-circle" /> Novo Aluguer
        </button>
      </div>

      {/* Filters */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr auto auto", gap:12, marginBottom:16, flexWrap:"wrap" }}>
        <div className="search-box">
          <i className="bi bi-search" />
          <input type="text" className="form-control" id="searchInput"
            placeholder="Buscar por cliente, veículo ou motorista..."
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select id="statusFilter" className="form-select" style={{ width:180 }}
          value={statusF} onChange={(e) => setStatusF(e.target.value)}>
          <option value="todos">Todos os Status</option>
          <option value="ativo">Ativos</option>
          <option value="concluido">Concluídos</option>
          <option value="cancelado">Cancelados</option>
        </select>
        <button className="btn-outline-custom" id="exportarBtn" onClick={exportCSV}>
          <i className="bi bi-download" /> Exportar CSV
        </button>
      </div>

      {/* Table */}
      <div className="table-container">
        <div className="table-responsive">
          <table className="table-custom">
            <thead>
              <tr>
                <th>Cliente</th><th>Veículo</th><th>Motorista</th><th>Rota</th>
                <th>Início</th><th>Fim Previsto</th><th>Valor (Kz)</th><th>Status</th><th>Ações</th>
              </tr>
            </thead>
            <tbody id="alugueresTable">
              {filtered.length === 0 ? (
                <EmptyRow cols={9} message="Nenhum aluguer encontrado." />
              ) : filtered.map((a) => (
                <tr key={a.id}>
                  <td><strong>{a.clienteNome}</strong>{(a as any).cliente_contato && <><br /><small style={{ color:"#888" }}>{(a as any).cliente_contato}</small></>}</td>
                  <td>{veiculoLabel((a as any).viaturaId)}</td>
                  <td>{motoristaLabel(a.motoristaId)}</td>
                  <td>{rotaLabel((a as any).rota_id)}</td>
                  <td>{a.dataInicio ? new Date(a.dataInicio).toLocaleDateString("pt-AO") : "—"}</td>
                  <td>{a.dataFimPrevista ? new Date(a.dataFimPrevista).toLocaleDateString("pt-AO") : "—"}</td>
                  <td>{Number(a.valorTotal).toLocaleString("pt-AO")}</td>
                  <td><StatusBadge status={a.status} /></td>
                  <td>
                    <button className="btn-action btn-edit" onClick={() => openEdit(a)}><i className="bi bi-pencil" /></button>
                    <button className="btn-action btn-pdf" title="Gerar PDF"><i className="bi bi-file-pdf" /></button>
                    <button className="btn-action btn-delete" onClick={() => handleDelete(a.id)}><i className="bi bi-trash" /></button>
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
          title={`${form.id ? "Editar" : "Novo"} Aluguer`}
          icon="bi-calendar-check"
          large
          onClose={() => setModal(false)}
          footer={
            <>
              <button className="btn-secondary-custom" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn-primary-custom" onClick={handleSave}>Salvar</button>
            </>
          }
        >
          <form id="aluguerForm">
            <input type="hidden" id="aluguerEditId" value={form.id ?? ""} />

            <div className="form-group">
              <label className="form-label">Nome do Cliente *</label>
              <input type="text" id="clienteNome" required className="form-control"
                placeholder="Nome completo ou empresa" value={form.clienteNome ?? ""} onChange={f("clienteNome")} />
            </div>
              <div className="form-group">
                <label className="form-label">Contacto do Cliente</label>
                <input type="text" id="clienteContato" className="form-control"
                  placeholder="Telefone ou email" value={(form as any).cliente_contato ?? ""} onChange={f("cliente_contato")} />
              </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Veículo *</label>
                <select id="veiculoId" required className="form-select" value={(form as any).viaturaId ?? ""} onChange={f("viaturaId")}>
                  <option value="">Selecione um veículo</option>
                  {veiculos.map((v) => (
                    <option key={v.id} value={v.id}>{v.marca} {v.modelo} ({v.placa})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Motorista</label>
                <select id="motoristaId" className="form-select" value={form.motoristaId ?? ""} onChange={f("motoristaId")}>
                  <option value="">Selecione um motorista</option>
                  {motoristas.filter((m) => m.status === "ativo").map((m) => (
                    <option key={m.id} value={m.id}>{m.nome}</option>
                  ))}
                </select>
              </div>
            </div>

              <div className="form-group">
                <label className="form-label">Rota</label>
                <select id="rotaId" className="form-select" value={(form as any).rota_id ?? ""} onChange={f("rota_id")}>
                <option value="">Selecione uma rota</option>
                {rotas.filter((r) => r.status === "ativa").map((r) => (
                  <option key={r.id} value={r.id}>{r.nomeRota} ({r.origem} → {r.destino})</option>
                ))}
              </select>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Data Início *</label>
                <input type="date" id="dataInicio" required className="form-control"
                  value={form.dataInicio ?? ""} onChange={f("dataInicio")} />
              </div>
              <div className="form-group">
                <label className="form-label">Data Fim Prevista *</label>
                <input type="date" id="dataFimPrevista" required className="form-control"
                  value={form.dataFimPrevista ?? ""} onChange={f("dataFimPrevista")} />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Valor Diária (Kz)</label>
                <input type="number" id="valorDiaria" className="form-control" min={0}
                  value={(form as any).valor_diaria ?? ""} onChange={f("valor_diaria")} />
              </div>
              <div className="form-group">
                <label className="form-label">Valor Total (Kz) *</label>
                <input type="number" id="valorTotal" required className="form-control" min={0}
                  value={form.valorTotal ?? ""} onChange={f("valorTotal")} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Status *</label>
              <select id="statusAluguer" required className="form-select" value={form.status ?? "ativo"} onChange={f("status")}>
                <option value="ativo">Ativo</option>
                <option value="concluido">Concluído</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Observações</label>
              <textarea id="observacoesAluguer" className="form-control" rows={2}
                value={form.observacoes ?? ""} onChange={f("observacoes")} />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
