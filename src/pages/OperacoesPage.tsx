// src/pages/OperacoesPage.tsx
// ─── Gestão de Operações (SuperAdmin) ─────────────────────────────────────────
// Visualiza serviços em andamento e finalizados, por tipo (aluguer/transporte/taxi).

import { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";
import { StatusBadge, EmptyRow } from "../components/StatusBadge";
import { servicosStore, veiculosStore, motoristasStore, proprietariosStore } from "../store";
import type { Servico, TipoServicoPedido, StatusServico } from "../types";

interface Props { onMenuToggle: () => void; onLogout: () => void; }

type Filtro = "todos" | StatusServico;
type FiltroTipo = "todos" | TipoServicoPedido;

export default function OperacoesPage({ onMenuToggle, onLogout }: Props) {
  const [servicos,  setServicos]  = useState<(Servico & { id: string })[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<Filtro>("todos");
  const [filtroTipo,   setFiltroTipo]   = useState<FiltroTipo>("todos");
  const [search,    setSearch]    = useState("");

  // Lookup maps
  const [viaturaMap,      setViaturaMap]      = useState<Map<string, string>>(new Map());
  const [motoristaMap,    setMotoristaMap]     = useState<Map<string, string>>(new Map());
  const [proprietarioMap, setProprietarioMap] = useState<Map<string, string>>(new Map());

  const reload = async () => {
    setLoading(true);
    const [sv, vi, mo, pr] = await Promise.all([
      servicosStore.getAll(),
      veiculosStore.getAll(),
      motoristasStore.getAll(),
      proprietariosStore.getAll(),
    ]);
    setServicos(sv);
    setViaturaMap(new Map(vi.map((v: any) => [v.id, `${v.marca} ${v.modelo} (${v.placa})`])));
    setMotoristaMap(new Map(mo.map((m: any) => [m.id, m.nome])));
    setProprietarioMap(new Map(pr.map((p: any) => [p.id, p.nome])));
    setLoading(false);
  };

  useEffect(() => { reload(); }, []);

  // Stats
  const emAndamento = servicos.filter((s: any) => s.status === "em_andamento").length;
  const finalizados = servicos.filter((s: any) => s.status === "finalizado").length;
  const cancelados  = servicos.filter((s: any) => s.status === "cancelado").length;
  const receitaTotal = servicos
    .filter((s: any) => s.status === "finalizado")
    .reduce((sum: number, s: any) => sum + (s.valorTotal ?? 0), 0);

  const filtered = servicos.filter((s: any) => {
    const matchStatus = filtroStatus === "todos" || s.status === filtroStatus;
    const matchTipo   = filtroTipo   === "todos" || s.tipo   === filtroTipo;
    const matchSearch = !search || [
      viaturaMap.get(s.viaturaId), motoristaMap.get(s.motoristaId ?? ""),
      s.clienteNome, s.origemNome, s.destinoNome,
    ].some((v) => v?.toLowerCase().includes(search.toLowerCase()));
    return matchStatus && matchTipo && matchSearch;
  });

  const handleFinalizar = async (s: Servico & { id: string }) => {
    if (!confirm("Marcar serviço como finalizado?")) return;
    await servicosStore.update(s.id, {
      status: "finalizado",
      dataFimReal: new Date().toISOString(),
    });
    reload();
  };

  const handleCancelar = async (s: Servico & { id: string }) => {
    if (!confirm("Cancelar este serviço?")) return;
    await servicosStore.update(s.id, { status: "cancelado" });
    reload();
  };

  const tipoLabel: Record<string, string> = {
    taxi: "Táxi", transporte: "Transporte", aluguer: "Aluguer",
  };
  const statusLabel: Record<string, string> = {
    em_andamento: "Em Andamento", finalizado: "Finalizado",
    cancelado: "Cancelado", pendente: "Pendente",
  };

  return (
    <div>
      <PageHeader icon="bi-clipboard2-data" title="Gestão de Operações" onMenuToggle={onMenuToggle} onLogout={onLogout} />

      {/* Stats */}
      <div className="stats-row" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 16, marginBottom: 20 }}>
        {[
          { label: "Em Andamento", value: emAndamento, icon: "bi-clock",          color: "#f39c12" },
          { label: "Finalizados",  value: finalizados,  icon: "bi-check-circle",   color: "#27ae60" },
          { label: "Cancelados",   value: cancelados,   icon: "bi-x-circle",       color: "#e74c3c" },
          { label: "Receita Total",value: `${receitaTotal.toLocaleString("pt-AO")} Kz`, icon: "bi-cash-coin", color: "#2980b9" },
        ].map((s) => (
          <div className="stat-card" key={s.label}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h6 className="text-muted" style={{ fontSize: 12 }}>{s.label}</h6>
                <h3 style={{ color: s.color, marginBottom: 0 }}>{s.value}</h3>
              </div>
              <i className={`bi ${s.icon} stat-icon`} style={{ color: s.color }} />
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div className="search-box" style={{ flex: 1, minWidth: 200 }}>
          <i className="bi bi-search" />
          <input type="text" className="form-control" placeholder="Buscar por viatura, motorista, cliente..."
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="form-select" style={{ width: "auto" }} value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value as Filtro)}>
          <option value="todos">Todos os status</option>
          <option value="em_andamento">Em Andamento</option>
          <option value="finalizado">Finalizados</option>
          <option value="cancelado">Cancelados</option>
          <option value="pendente">Pendentes</option>
        </select>
        <select className="form-select" style={{ width: "auto" }} value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value as FiltroTipo)}>
          <option value="todos">Todos os tipos</option>
          <option value="taxi">Táxi</option>
          <option value="transporte">Transporte</option>
          <option value="aluguer">Aluguer</option>
        </select>
        <button className="btn-secondary-custom" onClick={reload}>
          <i className="bi bi-arrow-clockwise" /> Actualizar
        </button>
      </div>

      {/* Table */}
      <div className="table-container">
        <div className="table-responsive">
          <table className="table-custom">
            <thead>
              <tr>
                <th>Tipo</th><th>Viatura</th><th>Motorista</th><th>Proprietário</th>
                <th>Cliente</th><th>Origem → Destino</th><th>Valor Total</th>
                <th>Prop (70%)</th><th>Sistema (30%)</th><th>Status</th>
                <th>Data Início</th><th style={{ width: 100 }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={12} style={{ textAlign: "center", padding: 24 }}><span className="loading-spinner" /></td></tr>
              ) : filtered.length === 0 ? (
                <EmptyRow cols={12} message="Nenhuma operação encontrada." />
              ) : filtered.map((s) => (
                <tr key={s.id}>
                  <td>
                    <span style={{
                      fontSize: 11, padding: "2px 8px", borderRadius: 12, fontWeight: 600,
                      background: s.tipo === "taxi" ? "#fff3cd" : s.tipo === "transporte" ? "#d1ecf1" : "#d4edda",
                      color:     s.tipo === "taxi" ? "#856404" : s.tipo === "transporte" ? "#0c5460" : "#155724",
                    }}>
                      {tipoLabel[s.tipo ?? "aluguer"] ?? s.tipo}
                    </span>
                  </td>
                  <td><small>{viaturaMap.get(s.viaturaId ?? "") ?? "—"}</small></td>
                  <td><small>{motoristaMap.get(s.motoristaId ?? "") ?? "—"}</small></td>
                  <td><small>{proprietarioMap.get(s.proprietarioId ?? "") ?? "—"}</small></td>
                  <td><small>{s.clienteNome ?? "—"}</small></td>
                  <td><small style={{ color: "#666" }}>{s.origemNome ?? "—"} {s.destinoNome ? `→ ${s.destinoNome}` : ""}</small></td>
                  <td><strong>{(s.valorTotal ?? 0).toLocaleString("pt-AO")} Kz</strong></td>
                  <td style={{ color: "#27ae60" }}>{(s.valorProprietario ?? 0).toLocaleString("pt-AO")} Kz</td>
                  <td style={{ color: "#2980b9" }}>{(s.valorSistema ?? 0).toLocaleString("pt-AO")} Kz</td>
                  <td><StatusBadge status={s.status} /></td>
                  <td><small>{s.dataInicio ? new Date(s.dataInicio).toLocaleDateString("pt-AO") : "—"}</small></td>
                  <td>
                    {s.status === "em_andamento" && (
                      <>
                        <button className="btn-action btn-edit" onClick={() => handleFinalizar(s)} title="Finalizar">
                          <i className="bi bi-check-lg" />
                        </button>
                        <button className="btn-action btn-delete" onClick={() => handleCancelar(s)} title="Cancelar">
                          <i className="bi bi-x-lg" />
                        </button>
                      </>
                    )}
                    {s.status !== "em_andamento" && (
                      <span style={{ color: "#aaa", fontSize: 12 }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
