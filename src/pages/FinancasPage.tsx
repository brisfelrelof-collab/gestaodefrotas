// src/pages/FinancasPage.tsx
// ─── Finanças do Proprietário ──────────────────────────────────────────────────
// Mostra ganhos por viatura. Proprietário recebe 70% do lucro.

import { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";
import { StatusBadge, EmptyRow } from "../components/StatusBadge";
import { servicosStore, veiculosStore } from "../store";
import type { Servico, Viatura } from "../types";

interface Props {
  onMenuToggle:   () => void;
  onLogout:       () => void;
  proprietarioId?: string;
}

interface ViaturaStats {
  viatura:      Viatura & { id: string };
  totalServicos: number;
  receitaBruta:  number;
  ganhoProprietario: number; // 70%
  sistemaCorte:      number; // 30%
  servicosAtivos:    number;
}

export default function FinancasPage({ onMenuToggle, onLogout, proprietarioId }: Props) {
  const [stats,    setStats]    = useState<ViaturaStats[]>([]);
  const [servicos, setServicos] = useState<(Servico & { id: string })[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [filtroViatura, setFiltroViatura] = useState<string>("todas");
  const [periodo,  setPeriodo]  = useState<"mes" | "trimestre" | "ano" | "todos">("mes");

  const reload = async () => {
    setLoading(true);
    if (!proprietarioId) { setLoading(false); return; }
    const [viaturas, allServicos] = await Promise.all([
      veiculosStore.getByProprietario(proprietarioId),
      servicosStore.getByProprietario(proprietarioId),
    ]);

    // Filter by period
    const agora = new Date();
    const filteredServicos = allServicos.filter((s: any) => {
      if (periodo === "todos") return true;
      const created = s.created_at ?? s.data_inicio ?? s.createdAt ?? s.dataInicio;
      if (!created) return false;
      const data = created?.toDate ? created.toDate() : new Date(created);
      const dias = periodo === "mes" ? 30 : periodo === "trimestre" ? 90 : 365;
      return (agora.getTime() - data.getTime()) / 86400000 <= dias;
    });

    setServicos(filteredServicos);

    const vStats: ViaturaStats[] = viaturas.map((v: Viatura & { id: string }) => {
      const vs = filteredServicos.filter((s: any) => s.viaturaId === v.id && s.status === "finalizado");
      const bruta = vs.reduce((sum: number, s: any) => sum + (s.valorTotal ?? 0), 0);
      return {
        viatura:           v,
        totalServicos:     vs.length,
        receitaBruta:      bruta,
        ganhoProprietario: Math.round(bruta * 0.7 * 100) / 100,
        sistemaCorte:      Math.round(bruta * 0.3 * 100) / 100,
        servicosAtivos:    filteredServicos.filter((s: any) => s.viaturaId === v.id && s.status === "em_andamento").length,
      };
    });

    setStats(vStats);
    setLoading(false);
  };

  useEffect(() => { reload(); }, [periodo, proprietarioId]);

  // Totals
  const totais = {
    bruta:    stats.reduce((s, v) => s + v.receitaBruta, 0),
    ganho:    stats.reduce((s, v) => s + v.ganhoProprietario, 0),
    corte:    stats.reduce((s, v) => s + v.sistemaCorte, 0),
    servicos: stats.reduce((s, v) => s + v.totalServicos, 0),
    ativos:   stats.reduce((s, v) => s + v.servicosAtivos, 0),
  };

  const filteredServicos = filtroViatura === "todas"
    ? servicos
    : servicos.filter((s: any) => s.viaturaId === filtroViatura);

  const viaturaList = stats.map((s) => s.viatura);

  const getViaturaLabel = (id?: string) => {
    if (!id) return "—";
    const v = viaturaList.find((vi: any) => vi.id === id);
    return v ? `${v.marca} ${v.modelo} (${v.placa})` : id;
  };

  return (
    <div>
      <PageHeader icon="bi-cash-coin" title="Finanças" onMenuToggle={onMenuToggle} onLogout={onLogout} />

      {/* Period selector */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {([
          { value: "mes",        label: "Último Mês" },
          { value: "trimestre",  label: "Trimestre" },
          { value: "ano",        label: "Último Ano" },
          { value: "todos",      label: "Todos" },
        ] as const).map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriodo(p.value)}
            style={{
              padding: "6px 16px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
              background: periodo === p.value ? "var(--primary-color)" : "#e9ecef",
              color:      periodo === p.value ? "white" : "#555",
            }}
          >
            {p.label}
          </button>
        ))}
        <button className="btn-secondary-custom" style={{ marginLeft: "auto" }} onClick={reload}>
          <i className="bi bi-arrow-clockwise" /> Actualizar
        </button>
      </div>

      {/* Summary stats */}
      <div className="stats-row" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Receita Bruta",       value: `${totais.bruta.toLocaleString("pt-AO")} Kz`,  icon: "bi-cash-stack",     color: "#2980b9" },
          { label: "O Seu Ganho (70%)",   value: `${totais.ganho.toLocaleString("pt-AO")} Kz`,  icon: "bi-wallet2",        color: "#27ae60" },
          { label: "Taxa do Sistema (30%)",value: `${totais.corte.toLocaleString("pt-AO")} Kz`, icon: "bi-percent",        color: "#e67e22" },
          { label: "Serviços Concluídos", value: totais.servicos,                                 icon: "bi-check-circle",   color: "#27ae60" },
          { label: "Em Andamento",        value: totais.ativos,                                   icon: "bi-clock",          color: "#f39c12" },
        ].map((s) => (
          <div className="stat-card" key={s.label}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h6 className="text-muted" style={{ fontSize: 11 }}>{s.label}</h6>
                <h3 style={{ color: s.color, marginBottom: 0, fontSize: 20 }}>{s.value}</h3>
              </div>
              <i className={`bi ${s.icon} stat-icon`} style={{ color: s.color }} />
            </div>
          </div>
        ))}
      </div>

      {/* Info box */}
      <div style={{
        background: "linear-gradient(135deg,#e8f5e9,#f1f8e9)", border: "1px solid #a5d6a7",
        borderRadius: 10, padding: "12px 16px", marginBottom: 20, display: "flex", gap: 12, alignItems: "center",
      }}>
        <i className="bi bi-info-circle-fill" style={{ color: "#27ae60", fontSize: 20 }} />
        <div>
          <strong style={{ color: "#1b5e20" }}>Divisão de lucros</strong>
          <div style={{ fontSize: 13, color: "#388e3c" }}>
            Você recebe <strong>70%</strong> de cada serviço concluído. O sistema retém <strong>30%</strong> como taxa de gestão.
          </div>
        </div>
      </div>

      {/* Per-viatura breakdown */}
      <div className="card-box" style={{ marginBottom: 24 }}>
        <h5><i className="bi bi-car-front" style={{ marginRight: 8 }} />Ganhos por Viatura</h5>
        {loading ? (
          <div style={{ textAlign: "center", padding: 24 }}><span className="loading-spinner" /></div>
        ) : stats.length === 0 ? (
          <div style={{ textAlign: "center", color: "#aaa", padding: 24 }}>
            <i className="bi bi-car-front" style={{ fontSize: 40, display: "block", marginBottom: 8 }} />
            Nenhuma viatura encontrada.
          </div>
        ) : stats.map((s) => (
          <div key={s.viatura.id} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "12px 0", borderBottom: "1px solid #f0f0f0", flexWrap: "wrap", gap: 8,
          }}>
            <div>
              <div style={{ fontWeight: 600, color: "#333" }}>
                {s.viatura.marca} {s.viatura.modelo}
                <span className="placa-format" style={{ marginLeft: 8, fontSize: 12 }}>{s.viatura.placa}</span>
              </div>
              <div style={{ fontSize: 12, color: "#888" }}>
                {s.totalServicos} serviço(s) concluído(s)
                {s.servicosAtivos > 0 && <span style={{ color: "#f39c12", marginLeft: 8 }}>• {s.servicosAtivos} em andamento</span>}
              </div>
            </div>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "#aaa" }}>Receita Bruta</div>
                <div style={{ fontWeight: 600 }}>{s.receitaBruta.toLocaleString("pt-AO")} Kz</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "#27ae60" }}>Seu Ganho (70%)</div>
                <div style={{ fontWeight: 700, color: "#27ae60", fontSize: 18 }}>
                  {s.ganhoProprietario.toLocaleString("pt-AO")} Kz
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "#aaa" }}>Status</div>
                <StatusBadge status={s.viatura.status} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent services */}
      <div className="card-box">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
          <h5 style={{ margin: 0 }}><i className="bi bi-list-ul" style={{ marginRight: 8 }} />Histórico de Serviços</h5>
          <select className="form-select" style={{ width: "auto" }} value={filtroViatura} onChange={(e) => setFiltroViatura(e.target.value)}>
            <option value="todas">Todas as viaturas</option>
            {viaturaList.map((v) => (
              <option key={v.id} value={v.id}>{v.marca} {v.modelo} ({v.placa})</option>
            ))}
          </select>
        </div>

        <div className="table-responsive">
          <table className="table-custom">
            <thead>
              <tr>
                <th>Viatura</th><th>Tipo</th><th>Cliente</th><th>Valor Total</th>
                <th>O Seu Ganho</th><th>Taxa Sistema</th><th>Status</th><th>Data</th>
              </tr>
            </thead>
            <tbody>
              {filteredServicos.length === 0 ? (
                <EmptyRow cols={8} message="Nenhum serviço no período seleccionado." />
              ) : filteredServicos.slice(0, 50).map((s) => (
                <tr key={s.id}>
                  <td><small>{getViaturaLabel(s.viaturaId)}</small></td>
                  <td><small>{s.tipo ?? "—"}</small></td>
                  <td><small>{s.clienteNome ?? "—"}</small></td>
                  <td><strong>{(s.valorTotal ?? 0).toLocaleString("pt-AO")} Kz</strong></td>
                  <td style={{ color: "#27ae60", fontWeight: 600 }}>{(s.valorProprietario ?? 0).toLocaleString("pt-AO")} Kz</td>
                  <td style={{ color: "#e67e22" }}>{(s.valorSistema ?? 0).toLocaleString("pt-AO")} Kz</td>
                  <td><StatusBadge status={s.status} /></td>
                  <td><small>{(() => {
                    const created = (s as any).created_at ?? (s as any).data_inicio ?? (s as any).createdAt ?? (s as any).dataInicio;
                    if (!created) return "—";
                    const dt = created?.toDate ? created.toDate() : new Date(created);
                    return dt.toLocaleDateString("pt-AO");
                  })()}</small></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
