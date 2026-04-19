// src/pages/SolicitarPage.tsx
import { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";
import { StatusBadge, EmptyRow } from "../components/StatusBadge";
import { servicosStore, veiculosStore } from "../store";
import { supabase } from "../supabase/client";
import { getUserProfile } from "../supabase/auth";
import type { Servico, TipoServicoPedido, Viatura } from "../types";

interface Props { onMenuToggle: () => void; onLogout: () => void; }

const TIPO_INFO: Record<TipoServicoPedido, { icon: string; label: string; desc: string; color: string }> = {
  taxi:       { icon: "bi-taxi-front", label: "Táxi",       desc: "Transporte rápido de ponto a ponto",   color: "#f39c12" },
  transporte: { icon: "bi-truck",      label: "Transporte", desc: "Transporte de carga ou mudança",        color: "#2980b9" },
  aluguer:    { icon: "bi-car-front",  label: "Aluguer",    desc: "Aluguer de viatura por horas ou dias",  color: "#27ae60" },
};

const EMPTY_FORM = {
  tipo: "taxi" as TipoServicoPedido,
  origemNome: "", destinoNome: "", observacoes: "",
  valorTotal: "", dataInicio: "", dataFimPrevista: "",
};

export default function SolicitarPage({ onMenuToggle, onLogout }: Props) {
  const [historico, setHistorico] = useState<(Servico & { id: string })[]>([]);
  const [viaturas,  setViaturas]  = useState<(Viatura & { id: string })[]>([]);
  const [modal,     setModal]     = useState(false);
  const [form,      setForm]      = useState({ ...EMPTY_FORM });
  const [loading,   setLoading]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [userName,  setUserName]  = useState("");
  const [uid,       setUid]       = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const userId = data.session?.user?.id ?? "";
      setUid(userId);
      if (userId) {
        const profile = await getUserProfile(userId);
        setUserName(profile?.nome ?? "");
        loadData(userId);
      }
    });
  }, []);

  const loadData = async (userId: string) => {
    setLoading(true);
    const [sv, vi] = await Promise.all([
      servicosStore.getByUsuario(userId),
      veiculosStore.getAll(),
    ]);
    setHistorico(sv);
    setViaturas(vi.filter((v) => v.status === "disponivel"));
    setLoading(false);
  };

  const handleSolicitar = async () => {
    if (!form.origemNome.trim()) { alert("Informe o local de origem."); return; }

    const viatura = viaturas.find((v) =>
      form.tipo === "transporte" ? v.tipo_servico === "carga" :
      form.tipo === "aluguer"    ? v.tipo_servico === "aluguer" :
      v.tipo_servico === "taxi"
    ) ?? viaturas[0];

    if (!viatura) { alert("Não há viaturas disponíveis para este tipo de serviço."); return; }

    const valorTotal = parseFloat(form.valorTotal) || 0;

    setSaving(true);
    try {
      await servicosStore.add({
        tipo:               form.tipo,
        status:             "pendente",
        usuario_id:         uid,
        viatura_id:         viatura.id,
        proprietario_id:    viatura.proprietario_id,
        origem_nome:        form.origemNome,
        destino_nome:       form.destinoNome,
        cliente_nome:       userName,
        valor_total:        valorTotal,
        valor_proprietario: Math.round(valorTotal * 0.7 * 100) / 100,
        valor_sistema:      Math.round(valorTotal * 0.3 * 100) / 100,
        data_inicio:        form.dataInicio || new Date().toISOString(),
        data_fim_prevista:  form.dataFimPrevista || undefined,
        observacoes:        form.observacoes,
      } as any);
      await loadData(uid);
      setModal(false);
      setForm({ ...EMPTY_FORM });
      alert("Pedido enviado com sucesso! O nosso operador entrará em contacto em breve.");
    } catch (err: any) {
      alert("Erro ao enviar pedido: " + (err.message ?? err));
    } finally {
      setSaving(false);
    }
  };

  const f = (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [field]: e.target.value }));

  const pendentes  = historico.filter((s) => s.status === "pendente").length;
  const emCurso    = historico.filter((s) => s.status === "em_andamento").length;
  const concluidos = historico.filter((s) => s.status === "finalizado").length;

  return (
    <div>
      <PageHeader icon="bi-car-front" title="Solicitar Serviço" onMenuToggle={onMenuToggle} onLogout={onLogout} />

      {/* Welcome */}
      <div style={{ background: "linear-gradient(135deg,#55a0a6,#3d7a7f)", borderRadius: 12, padding: "20px 24px", color: "white", marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h4 style={{ margin: 0, fontWeight: 700 }}>Olá, {userName || "Cliente"}! 👋</h4>
          <p style={{ margin: "4px 0 0", opacity: 0.85, fontSize: 14 }}>Solicite um serviço de transporte ou aluguer de viatura.</p>
        </div>
        <button onClick={() => setModal(true)} style={{ background: "white", color: "var(--primary-color)", border: "none", padding: "10px 22px", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
          <i className="bi bi-plus-circle" style={{ marginRight: 6 }} />Novo Pedido
        </button>
      </div>

      {/* Tipo cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16, marginBottom: 24 }}>
        {(Object.entries(TIPO_INFO) as [TipoServicoPedido, typeof TIPO_INFO[TipoServicoPedido]][]).map(([tipo, info]) => (
          <div key={tipo} onClick={() => { setForm({ ...EMPTY_FORM, tipo }); setModal(true); }}
            style={{ border: `2px solid ${info.color}20`, borderRadius: 12, padding: "18px 16px", cursor: "pointer", textAlign: "center", background: `${info.color}08` }}>
            <i className={`bi ${info.icon}`} style={{ fontSize: 36, color: info.color, display: "block", marginBottom: 8 }} />
            <div style={{ fontWeight: 700, color: "#333" }}>{info.label}</div>
            <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>{info.desc}</div>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Pendentes",  value: pendentes,  color: "#f39c12" },
          { label: "Em Curso",   value: emCurso,    color: "#2980b9" },
          { label: "Concluídos", value: concluidos, color: "#27ae60" },
          { label: "Total",      value: historico.length, color: "#555" },
        ].map((s) => (
          <div className="stat-card" key={s.label} style={{ textAlign: "center" }}>
            <h3 style={{ color: s.color, marginBottom: 4 }}>{s.value}</h3>
            <div style={{ fontSize: 12, color: "#888" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Histórico */}
      <div className="card-box">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h5 style={{ margin: 0 }}><i className="bi bi-clock-history" style={{ marginRight: 8 }} />Os Meus Pedidos</h5>
          <button className="btn-secondary-custom" onClick={() => loadData(uid)}><i className="bi bi-arrow-clockwise" /></button>
        </div>
        <div className="table-responsive">
          <table className="table-custom">
            <thead>
              <tr><th>Tipo</th><th>Origem</th><th>Destino</th><th>Valor</th><th>Status</th><th>Data</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: 24 }}><span className="loading-spinner" /></td></tr>
              ) : historico.length === 0 ? (
                <EmptyRow cols={6} message="Nenhum pedido realizado ainda." />
              ) : historico.map((s) => (
                <tr key={s.id}>
                  <td>
                    <i className={`bi ${TIPO_INFO[s.tipo as TipoServicoPedido]?.icon ?? "bi-car-front"}`} style={{ marginRight: 6, color: TIPO_INFO[s.tipo as TipoServicoPedido]?.color }} />
                    {TIPO_INFO[s.tipo as TipoServicoPedido]?.label ?? s.tipo}
                  </td>
                  <td><small>{s.origem_nome ?? "—"}</small></td>
                  <td><small>{s.destino_nome ?? "—"}</small></td>
                  <td><strong>{s.valor_total ? `${s.valor_total.toLocaleString("pt-AO")} Kz` : "A definir"}</strong></td>
                  <td><StatusBadge status={s.status} /></td>
                  <td><small>{s.created_at ? new Date(s.created_at).toLocaleDateString("pt-AO") : "—"}</small></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="modal-overlay active" onClick={() => setModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h5><i className="bi bi-car-front" style={{ marginRight: 8 }} />Novo Pedido de Serviço</h5>
              <button className="modal-close" onClick={() => setModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Tipo de Serviço *</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                  {(Object.entries(TIPO_INFO) as [TipoServicoPedido, typeof TIPO_INFO[TipoServicoPedido]][]).map(([tipo, info]) => (
                    <div key={tipo} onClick={() => setForm((p) => ({ ...p, tipo }))}
                      style={{ textAlign: "center", padding: "10px 8px", borderRadius: 8, cursor: "pointer", border: `2px solid ${form.tipo === tipo ? info.color : "#ddd"}`, background: form.tipo === tipo ? `${info.color}12` : "white" }}>
                      <i className={`bi ${info.icon}`} style={{ fontSize: 22, color: info.color, display: "block" }} />
                      <div style={{ fontSize: 12, fontWeight: 600, marginTop: 4 }}>{info.label}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Local de Origem *</label>
                <input type="text" className="form-control" placeholder="Ex: Miramar, Luanda" value={form.origemNome} onChange={f("origemNome")} />
              </div>
              <div className="form-group">
                <label className="form-label">Local de Destino</label>
                <input type="text" className="form-control" placeholder="Ex: Aeroporto Internacional" value={form.destinoNome} onChange={f("destinoNome")} />
              </div>
              {form.tipo === "aluguer" && (
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Data de Início</label>
                    <input type="datetime-local" className="form-control" value={form.dataInicio} onChange={f("dataInicio")} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Data de Fim</label>
                    <input type="datetime-local" className="form-control" value={form.dataFimPrevista} onChange={f("dataFimPrevista")} />
                  </div>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Valor Acordado (Kz)</label>
                <input type="number" className="form-control" min={0} placeholder="Deixe em branco para definir depois" value={form.valorTotal} onChange={f("valorTotal")} />
              </div>
              <div className="form-group">
                <label className="form-label">Observações</label>
                <textarea className="form-control" rows={2} placeholder="Informações adicionais..." value={form.observacoes} onChange={f("observacoes")} />
              </div>
              <div style={{ fontSize: 12, color: "#888", background: "#f8f9fa", borderRadius: 8, padding: 10 }}>
                <i className="bi bi-info-circle" style={{ marginRight: 6 }} />Após o envio, um operador confirmará o seu pedido.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary-custom" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn-primary-custom" onClick={handleSolicitar} disabled={saving}>
                {saving ? <><span className="loading-spinner" style={{ width: 14, height: 14, marginRight: 6 }} />A enviar...</> : "Enviar Pedido"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
