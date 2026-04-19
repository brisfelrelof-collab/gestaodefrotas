// src/pages/VeiculosPage.tsx
// ─── Gestão de Viaturas (updated with proprietarioId + tipoServico) ─────────────
// Mantém todas as funcionalidades existentes.
// NOVO: campo obrigatório `proprietarioId` e `tipoServico`.

import { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";
import { StatusBadge, Modal, EmptyRow } from "../components/StatusBadge";
import { veiculosStore, validarPlacaAngolana, proprietariosStore } from "../store";
import type { Viatura, Proprietario, TipoServico } from "../types";

const CORES = ["Branco","Preto","Prata","Cinza","Vermelho","Azul","Verde","Amarelo","Laranja","Marrom","Bege","Dourado"];

const EMPTY: Partial<Viatura> = {
  placa: "", nome: "", marca: "", modelo: "", ano: 2020, cor: "", status: "disponivel", tipoServico: "aluguer", proprietarioId: "",
};

interface Props { onMenuToggle: () => void; onLogout: () => void; }

export default function VeiculosPage({ onMenuToggle, onLogout }: Props) {
  const [viaturas,      setViaturas]      = useState<(Viatura & { id: string })[]>([]);
  const [proprietarios, setProprietarios] = useState<(Proprietario & { id: string })[]>([]);
  const [search,        setSearch]        = useState("");
  const [filtroTipo,    setFiltroTipo]    = useState<TipoServico | "">("");
  const [modal,         setModal]         = useState(false);
  const [form,          setForm]          = useState<Partial<Viatura>>({ ...EMPTY });
  const [placaError,    setPlacaError]    = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [saving,        setSaving]        = useState(false);

  const reload = async () => {
    setLoading(true);
    const [v, p] = await Promise.all([veiculosStore.getAll(), proprietariosStore.getAll()]);
    setViaturas(v);
    setProprietarios(p);
    setLoading(false);
  };

  useEffect(() => { reload(); }, []);

  const getProprietarioNome = (id?: string) =>
    proprietarios.find((p) => p.id === id)?.nome ?? "—";

  const filtered = viaturas.filter((v) => {
    const matchSearch = [v.placa, v.marca, v.modelo, v.cor, v.nome].some((field) =>
      field?.toLowerCase().includes(search.toLowerCase())
    );
    const matchTipo = filtroTipo ? v.tipoServico === filtroTipo : true;
    return matchSearch && matchTipo;
  });

  const openNew  = () => { setForm({ ...EMPTY }); setPlacaError(false); setModal(true); };
  const openEdit = (v: Viatura) => { setForm({ ...v }); setPlacaError(false); setModal(true); };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta viatura?")) return;
    await veiculosStore.remove(id);
    reload();
  };

  const validatePlaca = (value: string) => {
    const { valido, formatado } = validarPlacaAngolana(value);
    setPlacaError(!valido && value.length > 0);
    if (valido) setForm((f) => ({ ...f, placa: formatado }));
  };

  const handleSave = async () => {
    if (!form.placa || !form.marca || !form.modelo || !form.ano || !form.cor || !form.nome) {
      alert("Preencha todos os campos obrigatórios."); return;
    }
    if (!form.proprietarioId) {
      alert("Selecione o proprietário da viatura."); return;
    }
    const { valido } = validarPlacaAngolana(form.placa);
    if (!valido) { alert("Formato de placa inválido."); return; }

    setSaving(true);

    try {
      if (form.id) {
        const { id, ...data } = form as Viatura;
        if (await veiculosStore.exists("placa", form.placa, id)) {
          alert("Já existe uma viatura com esta placa."); return;
        }
        await veiculosStore.update(id, data);
      } else {
        if (await veiculosStore.exists("placa", form.placa)) {
          alert("Já existe uma viatura com esta placa."); return;
        }
        await veiculosStore.add(form as Omit<Viatura, "id">);
      }
      await reload();
      setModal(false);
    } finally {
      setSaving(false);
    }
  };

  const f = (field: keyof Viatura) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [field]: e.target.value }));

  const tipoLabel: Record<TipoServico, string> = {
    taxi: "Táxi", carga: "Transporte de Carga", aluguer: "Aluguer", outros: "Outros",
  };

  return (
    <div>
      <PageHeader icon="bi-car-front" title="Gestão de Viaturas" onMenuToggle={onMenuToggle} onLogout={onLogout} />

      {/* Toolbar */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button className="btn-primary-custom" onClick={openNew}>
          <i className="bi bi-plus-circle" /> Nova Viatura
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div className="search-box" style={{ flex: 1, minWidth: 220 }}>
          <i className="bi bi-search" />
          <input
            type="text" className="form-control"
            placeholder="Buscar por placa, marca, modelo, cor ou nome..."
            value={search} onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="form-select" style={{ width: "auto" }} value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value as TipoServico | "")}>
          <option value="">Todos os tipos</option>
          <option value="taxi">Táxi</option>
          <option value="carga">Transporte de Carga</option>
          <option value="aluguer">Aluguer</option>
          <option value="outros">Outros</option>
        </select>
      </div>

      {/* Table */}
      <div className="table-container">
        <div className="table-responsive">
          <table className="table-custom">
            <thead>
              <tr>
                <th>Matrícula/Placa</th><th>Nome</th><th>Marca</th><th>Modelo</th>
                <th>Ano</th><th>Cor</th><th>Tipo Serviço</th>
                <th>Proprietário</th><th>IP ESP</th><th>Status</th>
                <th style={{ width: 100 }}>Ações</th>
              </tr>
            </thead>
            <tbody id="veiculosTable">
              {loading ? (
                <tr><td colSpan={11} style={{ textAlign: "center", padding: 24 }}><span className="loading-spinner" /></td></tr>
              ) : filtered.length === 0 ? (
                <EmptyRow cols={11} message="Nenhuma viatura cadastrada." />
              ) : filtered.map((v) => (
                <tr key={v.id}>
                  <td><span className="placa-format">{v.placa}</span></td>
                  <td>{v.nome}</td>
                  <td>{v.marca}</td>
                  <td>{v.modelo}</td>
                  <td>{v.ano}</td>
                  <td>{v.cor}</td>
                  <td>
                    <span style={{
                      fontSize: 11, padding: "2px 8px", borderRadius: 12, fontWeight: 600,
                      background: (v.tipoServico ?? "aluguer") === "taxi" ? "#fff3cd" : (v.tipoServico ?? "aluguer") === "carga" ? "#d1ecf1" : (v.tipoServico ?? "aluguer") === "aluguer" ? "#d4edda" : "#f8d7da",
                      color:      (v.tipoServico ?? "aluguer") === "taxi" ? "#856404" : (v.tipoServico ?? "aluguer") === "carga" ? "#0c5460" : (v.tipoServico ?? "aluguer") === "aluguer" ? "#155724" : "#721c24",
                    }}>
                      {tipoLabel[(v.tipoServico ?? "aluguer") as TipoServico] ?? (v.tipoServico ?? "aluguer")}
                    </span>
                  </td>
                  <td><small>{getProprietarioNome(v.proprietarioId)}</small></td>
                  <td><small style={{ color: "#888" }}>{v.ipEsp || "—"}</small></td>
                  <td><StatusBadge status={v.status} /></td>
                  <td>
                    <button className="btn-action btn-edit" onClick={() => openEdit(v)}><i className="bi bi-pencil" /></button>
                    <button className="btn-action btn-delete" onClick={() => handleDelete(v.id)}><i className="bi bi-trash" /></button>
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
          title={`${form.id ? "Editar" : "Cadastro de"} Viatura`}
          icon="bi-car-front"
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
            {/* Proprietário — NEW required field */}
            <div className="form-group">
              <label className="form-label">Proprietário *</label>
              <select className="form-select" required value={form.proprietarioId ?? ""} onChange={f("proprietarioId")}>
                <option value="">Selecione o proprietário</option>
                {proprietarios.map((p) => (
                  <option key={p.id} value={p.id}>{p.nome} ({p.nif})</option>
                ))}
              </select>
              {proprietarios.length === 0 && (
                <small style={{ color: "#e74c3c" }}>⚠️ Nenhum proprietário cadastrado. Crie um primeiro.</small>
              )}
            </div>

            {/* Tipo de Serviço — NEW field */}
            <div className="form-group">
              <label className="form-label">Tipo de Serviço *</label>
              <select className="form-select" required value={form.tipoServico ?? "aluguer"} onChange={f("tipoServico")}>
                <option value="taxi">Táxi</option>
                <option value="carga">Transporte de Carga</option>
                <option value="aluguer">Aluguer</option>
                <option value="outros">Outros</option>
              </select>
            </div>

            {/* Placa */}
            <div className="form-group">
              <label className="form-label">Matrícula/Placa *</label>
              <input
                type="text" required maxLength={12}
                className={`form-control ${placaError ? "is-invalid" : ""}`}
                style={{ textTransform: "uppercase" }}
                placeholder="Ex: ABC-1234 ou LD-00-11-AB"
                value={form.placa ?? ""}
                onChange={(e) => {
                  setForm((p) => ({ ...p, placa: e.target.value.toUpperCase() }));
                  validatePlaca(e.target.value);
                }}
              />
              </div>
              <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Marca *</label>
                <input type="text" required className="form-control" placeholder="Ex: Toyota, Ford" value={form.marca ?? ""} onChange={f("marca")} />
              </div>
              <div className="form-group">
                <label className="form-label">Modelo *</label>
                <input type="text" required className="form-control" placeholder="Ex: Corolla, Hilux" value={form.modelo ?? ""} onChange={f("modelo")} />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Ano *</label>
                <input type="number" required className="form-control" min={1990} max={2030} value={form.ano ?? ""} onChange={f("ano")} />
              </div>
              <div className="form-group">
                <label className="form-label">Cor *</label>
                <select required className="form-select" value={form.cor ?? ""} onChange={f("cor")}>
                  <option value="">Selecione a cor</option>
                  {CORES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Status *</label>
              <select required className="form-select" value={form.status ?? "disponivel"} onChange={f("status")}>
                <option value="disponivel">Disponível</option>
                <option value="ocupada">Ocupada</option>
                <option value="alugado">Alugada</option>
                <option value="manutencao">Manutenção</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Nome da Viatura *</label>
              <input type="text" required className="form-control" placeholder="Ex: viatura1" value={form.nome ?? ""} onChange={f("nome")} />
            </div>

            <div className="form-group">
              <label className="form-label">IP do ESP (opcional)</label>
              <input type="text" className="form-control" placeholder="Ex: http://192.168.43.134" value={form.ipEsp ?? ""} onChange={f("ipEsp")} />
            </div>

            <div className="form-group">
              <label className="form-label">Observações</label>
              <textarea className="form-control" rows={2} value={form.observacoes ?? ""} onChange={f("observacoes")} />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
