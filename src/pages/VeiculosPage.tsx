// pages/VeiculosPage.tsx
import { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";
import { StatusBadge, Modal, EmptyRow } from "../components/StatusBadge";
import { veiculosStore, validarPlacaAngolana } from "../store";
import type { Veiculo } from "../types";

const CORES = ["Branco","Preto","Prata","Cinza","Vermelho","Azul","Verde","Amarelo","Laranja","Marrom","Bege","Dourado"];
const EMPTY: Omit<Veiculo,"id"> = { placa:"", nome:"", marca:"", modelo:"", ano:2024, cor:"", status:"disponivel" };

interface VeiculosPageProps {
  onMenuToggle: () => void;
  onLogout: () => void;
}

export default function VeiculosPage({ onMenuToggle, onLogout }: VeiculosPageProps) {
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [search, setSearch]     = useState("");
  const [modal, setModal]       = useState(false);
  const [form, setForm]         = useState<Partial<Veiculo>>({ ...EMPTY });
  const [placaError, setPlacaError] = useState(false);

  const reload = () => setVeiculos(veiculosStore.getAll());
  useEffect(() => { reload(); }, []);

  const filtered = veiculos.filter((v) =>
    [v.placa, v.marca, v.modelo, v.cor, v.nome].some((f) =>
      f?.toLowerCase().includes(search.toLowerCase())
    )
  );

  const openNew  = () => { setForm({ ...EMPTY }); setPlacaError(false); setModal(true); };
  const openEdit = (v: Veiculo) => { setForm({ ...v }); setPlacaError(false); setModal(true); };

  const handleDelete = (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este veículo?")) return;
    veiculosStore.remove(id);
    reload();
  };

  const validatePlaca = (value: string) => {
    const { valido, formatado } = validarPlacaAngolana(value);
    setPlacaError(!valido && value.length > 0);
    if (valido) setForm((f) => ({ ...f, placa: formatado }));
  };

  const handleSave = () => {
    if (!form.placa || !form.marca || !form.modelo || !form.ano || !form.cor || !form.nome) {
      alert("Preencha todos os campos obrigatórios."); return;
    }
    const { valido } = validarPlacaAngolana(form.placa);
    if (!valido) { alert("Formato de placa inválido."); return; }

    if (form.id) {
      const { id, ...data } = form as Veiculo;
      if (veiculosStore.exists("placa", form.placa, id)) {
        alert("Já existe um veículo com esta placa."); return;
      }
      veiculosStore.update(id, data);
    } else {
      if (veiculosStore.exists("placa", form.placa)) {
        alert("Já existe um veículo com esta placa."); return;
      }
      veiculosStore.add(form as Omit<Veiculo,"id">);
    }
    reload(); setModal(false);
  };

  const f = (field: keyof Veiculo) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [field]: e.target.value }));

  return (
    <div>
      <PageHeader icon="bi-car-front" title="Gestão de Veículos" onMenuToggle={onMenuToggle} onLogout={onLogout} />

      {/* Toolbar */}
      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:16 }}>
        <button className="btn-primary-custom" onClick={openNew}>
          <i className="bi bi-plus-circle" /> Novo Veículo
        </button>
      </div>

      {/* Search + viatura map shortcut */}
      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
        <div className="search-box" style={{ flex:1, minWidth:220 }}>
          <i className="bi bi-search" />
          <input
            type="text" className="form-control" id="searchInput"
            placeholder="Buscar veículo por placa, marca, modelo, cor ou nome..."
            value={search} onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <div className="table-responsive">
          <table className="table-custom">
            <thead>
              <tr>
                <th>Matrícula/Placa</th><th>Nome</th><th>Marca</th><th>Modelo</th>
                <th>Ano</th><th>Cor</th><th>IP ESP</th><th>Status</th>
                <th style={{ width:140 }}>Ações</th>
              </tr>
            </thead>
            <tbody id="veiculosTable">
              {filtered.length === 0 ? (
                <EmptyRow cols={9} message="Nenhum veículo cadastrado." />
              ) : filtered.map((v) => (
                <tr key={v.id}>
                  <td><span className="placa-format">{v.placa}</span></td>
                  <td>{v.nome}</td>
                  <td>{v.marca}</td>
                  <td>{v.modelo}</td>
                  <td>{v.ano}</td>
                  <td>{v.cor}</td>
                  <td><small style={{ color:"#888" }}>{v.ipEsp || "—"}</small></td>
                  <td><StatusBadge status={v.status} /></td>
                  <td>
                    <button className="btn-action btn-edit" onClick={() => openEdit(v)}>
                      <i className="bi bi-pencil" />
                    </button>
                    <button className="btn-action btn-delete" onClick={() => handleDelete(v.id)}>
                      <i className="bi bi-trash" />
                    </button>
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
          title={`${form.id ? "Editar" : "Cadastro de"} Veículo`}
          icon="bi-car-front"
          onClose={() => setModal(false)}
          footer={
            <>
              <button className="btn-secondary-custom" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn-primary-custom" onClick={handleSave}>Salvar</button>
            </>
          }
        >
          <form id="vehicleForm">
            <input type="hidden" id="vehicleId" value={form.id ?? ""} />

            <div className="form-group">
              <label className="form-label">Matrícula/Placa *</label>
              <input
                type="text" id="placa" required maxLength={12}
                className={`form-control ${placaError ? "is-invalid" : ""}`}
                style={{ textTransform:"uppercase" }}
                placeholder="Ex: ABC-1234 ou LD-00-11-AB"
                value={form.placa ?? ""}
                onChange={(e) => { setForm((p) => ({ ...p, placa: e.target.value.toUpperCase() })); validatePlaca(e.target.value); }}
              />
              <div className="invalid-feedback" id="placaError">
                Formato inválido. Ex: ABC-1234 ou LD-00-11-AB
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Marca *</label>
                <input type="text" id="marca" required className="form-control"
                  placeholder="Ex: Toyota, Ford" value={form.marca ?? ""} onChange={f("marca")} />
              </div>
              <div className="form-group">
                <label className="form-label">Modelo *</label>
                <input type="text" id="modelo" required className="form-control"
                  placeholder="Ex: Corolla, Hilux" value={form.modelo ?? ""} onChange={f("modelo")} />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Ano *</label>
                <input type="number" id="ano" required className="form-control"
                  min={1990} max={2026} value={form.ano ?? ""} onChange={f("ano")} />
              </div>
              <div className="form-group">
                <label className="form-label">Cor *</label>
                <select id="cor" required className="form-select" value={form.cor ?? ""} onChange={f("cor")}>
                  <option value="">Selecione a cor</option>
                  {CORES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Status *</label>
              <select id="status" required className="form-select" value={form.status ?? "disponivel"} onChange={f("status")}>
                <option value="disponivel">Disponível</option>
                <option value="alugado">Alugado</option>
                <option value="manutencao">Manutenção</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Nome da Viatura *</label>
              <input type="text" id="nomeViatura" required className="form-control"
                placeholder="Ex: viatura1" value={form.nome ?? ""} onChange={f("nome")} />
            </div>

            <div className="form-group">
              <label className="form-label">IP do ESP (opcional)</label>
              <input type="text" id="ipEsp" className="form-control"
                placeholder="Ex: http://192.168.43.134" value={form.ipEsp ?? ""} onChange={f("ipEsp")} />
            </div>

            <div className="form-group">
              <label className="form-label">Observações</label>
              <textarea id="observacoes" className="form-control" rows={2}
                placeholder="Informações adicionais sobre o veículo (km, seguro, etc)"
                value={form.observacoes ?? ""} onChange={f("observacoes")} />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
