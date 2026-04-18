// pages/MotoristasPage.tsx
import { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";
import { StatusBadge, Modal, EmptyRow } from "../components/StatusBadge";
import { motoristasStore } from "../store";
import type { Motorista } from "../types";

const PROVINCIAS = [
  "Bengo","Benguela","Bié","Cabinda","Cuando Cubango","Cuanza Norte",
  "Cuanza Sul","Cunene","Huambo","Huíla","Luanda","Lunda Norte",
  "Lunda Sul","Malanje","Moxico","Namibe","Uíge","Zaire",
];

const EMPTY: Omit<Motorista,"id"> = {
  nome:"", bi:"", cartaConducao:"", categoriaCarta:"B",
  telefone:"", dataNascimento:"", provincia:"", status:"ativo",
};

interface MotoristasPageProps {
  onMenuToggle: () => void;
  onLogout: () => void;
}

export default function MotoristasPage({ onMenuToggle, onLogout }: MotoristasPageProps) {
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [search, setSearch]         = useState("");
  const [modal, setModal]           = useState(false);
  const [form, setForm]             = useState<Partial<Motorista>>({ ...EMPTY });

  const reload = () => setMotoristas(motoristasStore.getAll().sort((a,b) => a.nome.localeCompare(b.nome)));
  useEffect(() => { reload(); }, []);

  const filtered = motoristas.filter((m) =>
    [m.nome, m.bi, m.cartaConducao, m.telefone, m.email].some((f) =>
      f?.toLowerCase().includes(search.toLowerCase())
    )
  );

  const openNew  = () => { setForm({ ...EMPTY }); setModal(true); };
  const openEdit = (m: Motorista) => { setForm({ ...m }); setModal(true); };

  const handleDelete = (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este motorista?")) return;
    motoristasStore.remove(id); reload();
  };

  const handleSave = () => {
    const bi = form.bi?.trim().toUpperCase() ?? "";
    if (!form.nome?.trim())        { alert("Nome é obrigatório!");              return; }
    if (!bi)                       { alert("BI é obrigatório!");                return; }
    if (!form.cartaConducao?.trim()){ alert("Carta de condução é obrigatória!"); return; }
    if (!form.categoriaCarta)      { alert("Categoria é obrigatória!");         return; }
    if (!form.telefone?.trim())    { alert("Telefone é obrigatório!");          return; }
    if (!form.dataNascimento)      { alert("Data de nascimento é obrigatória!"); return; }
    if (!form.provincia)           { alert("Província é obrigatória!");         return; }

    if (!form.id && motoristasStore.exists("bi", bi)) {
      alert("Já existe um motorista com este BI!"); return;
    }

    const data = { ...form, bi } as Omit<Motorista,"id">;
    if (form.id) motoristasStore.update(form.id, data);
    else         motoristasStore.add(data);
    reload(); setModal(false);
  };

  const f = (field: keyof Motorista) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [field]: e.target.value }));

  const fmtTelefone = (tel: string) =>
    tel && tel.replace(/\D/g,"").length === 9
      ? tel.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3")
      : tel;

  return (
    <div>
      <PageHeader icon="bi-person-badge" title="Gestão de Motoristas" onMenuToggle={onMenuToggle} onLogout={onLogout} />

      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:16 }}>
        <button className="btn-primary-custom" onClick={openNew}>
          <i className="bi bi-plus-circle" /> Novo Motorista
        </button>
      </div>

      <div className="search-box" style={{ marginBottom:16 }}>
        <i className="bi bi-search" />
        <input type="text" className="form-control" id="searchInput"
          placeholder="Buscar motorista por nome, BI, carta..."
          value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="table-container">
        <div className="table-responsive">
          <table className="table-custom">
            <thead>
              <tr>
                <th>Nome Completo</th><th>BI/Nº</th><th>Carta Condução</th>
                <th>Categoria</th><th>Telefone</th><th>Email</th>
                <th>Status</th><th>Ações</th>
              </tr>
            </thead>
            <tbody id="motoristasTable">
              {filtered.length === 0 ? (
                <EmptyRow cols={8} message="Nenhum motorista cadastrado." />
              ) : filtered.map((m) => (
                <tr key={m.id}>
                  <td>
                    <strong>{m.nome}</strong>
                    {(m.provincia || m.municipio) && (
                      <><br /><small style={{ color:"#888" }}>{m.provincia}{m.municipio ? `, ${m.municipio}` : ""}</small></>
                    )}
                  </td>
                  <td>{m.bi}</td>
                  <td>
                    {m.cartaConducao}
                    <br /><small style={{ color:"#888" }}>{m.categoriaCarta}</small>
                  </td>
                  <td>{m.categoriaCarta}</td>
                  <td>
                    {fmtTelefone(m.telefone)}
                    {m.telefoneAlternativo && (
                      <><br /><small>Alt: {m.telefoneAlternativo}</small></>
                    )}
                  </td>
                  <td>{m.email || "—"}</td>
                  <td><StatusBadge status={m.status} /></td>
                  <td>
                    <button className="btn-action btn-edit" onClick={() => openEdit(m)}><i className="bi bi-pencil" /></button>
                    <button className="btn-action btn-delete" onClick={() => handleDelete(m.id)}><i className="bi bi-trash" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <Modal
          title={`${form.id ? "Editar" : "Cadastro de"} Motorista`}
          icon="bi-person-badge"
          large
          onClose={() => setModal(false)}
          footer={
            <>
              <button className="btn-secondary-custom" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn-primary-custom" onClick={handleSave}>Salvar</button>
            </>
          }
        >
          <form id="driverForm">
            <input type="hidden" id="driverId" value={form.id ?? ""} />
            <div className="grid-2">
              <div className="form-group" style={{ gridColumn:"1 / span 1" }}>
                <label className="form-label">Nome Completo *</label>
                <input type="text" id="nome" required className="form-control" value={form.nome ?? ""} onChange={f("nome")} />
              </div>
              <div className="form-group">
                <label className="form-label">BI/Nº *</label>
                <input type="text" id="bi" required className="form-control" value={form.bi ?? ""} onChange={f("bi")} />
              </div>
            </div>
            <div className="grid-3">
              <div className="form-group">
                <label className="form-label">Carta Condução *</label>
                <input type="text" id="cartaConducao" required className="form-control" value={form.cartaConducao ?? ""} onChange={f("cartaConducao")} />
              </div>
              <div className="form-group">
                <label className="form-label">Categoria *</label>
                <select id="categoriaCarta" required className="form-select" value={form.categoriaCarta ?? "B"} onChange={f("categoriaCarta")}>
                  <option value="">Selecione</option>
                  <option value="A">A - Motociclos</option>
                  <option value="B">B - Ligeiros</option>
                  <option value="C">C - Pesados</option>
                  <option value="D">D - Passageiros</option>
                  <option value="E">E - Com reboque</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Validade</label>
                <input type="date" id="validadeCarta" className="form-control" value={form.validadeCarta ?? ""} onChange={f("validadeCarta")} />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Telefone *</label>
                <input type="tel" id="telefone" required className="form-control" value={form.telefone ?? ""} onChange={f("telefone")} />
              </div>
              <div className="form-group">
                <label className="form-label">Telefone Alternativo</label>
                <input type="tel" id="telefoneAlternativo" className="form-control" value={form.telefoneAlternativo ?? ""} onChange={f("telefoneAlternativo")} />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="email" id="email" className="form-control" value={form.email ?? ""} onChange={f("email")} />
              </div>
              <div className="form-group">
                <label className="form-label">Data Nascimento *</label>
                <input type="date" id="dataNascimento" required className="form-control" value={form.dataNascimento ?? ""} onChange={f("dataNascimento")} />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Província *</label>
                <select id="provincia" required className="form-select" value={form.provincia ?? ""} onChange={f("provincia")}>
                  <option value="">Selecione</option>
                  {PROVINCIAS.map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Município</label>
                <input type="text" id="municipio" className="form-control" value={form.municipio ?? ""} onChange={f("municipio")} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Endereço</label>
              <textarea id="endereco" className="form-control" rows={2} value={form.endereco ?? ""} onChange={f("endereco")} />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Status *</label>
                <select id="statusMotorista" required className="form-select" value={form.status ?? "ativo"} onChange={f("status")}>
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                  <option value="ferias">Férias</option>
                  <option value="licenca">Licença Médica</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Data Admissão</label>
                <input type="date" id="dataAdmissao" className="form-control" value={form.dataAdmissao ?? ""} onChange={f("dataAdmissao")} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Observações</label>
              <textarea id="observacoes" className="form-control" rows={2} value={form.observacoes ?? ""} onChange={f("observacoes")} />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
