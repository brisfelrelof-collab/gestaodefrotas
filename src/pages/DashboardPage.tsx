// pages/DashboardPage.tsx
import { useEffect, useRef, useState } from "react";
import PageHeader from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import {
  veiculosStore, motoristasStore, rotasStore, alugueresStore,
} from "../store";
import type { Aluguer, Veiculo, Motorista, Rota } from "../types";

interface DashboardPageProps {
  onMenuToggle: () => void;
  onLogout: () => void;
}

export default function DashboardPage({ onMenuToggle, onLogout }: DashboardPageProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<any>(null);

  const [stats, setStats] = useState({ veiculos: 0, motoristas: 0, rotas: 0, ativos: 0 });
  const [recentAlugueres, setRecentAlugueres] = useState<Aluguer[]>([]);

  // Support maps (mirrors carregarDadosApoio)
  const veiculosMap = useRef(new Map<string, Veiculo>());
  const motoristasMap = useRef(new Map<string, Motorista>());
  const rotasMap = useRef(new Map<string, Rota>());

  function getVeiculoInfo(veiculoId: string) {
    const v = veiculosMap.current.get(veiculoId);
    if (v) return { completo: `${v.marca} ${v.modelo} (${v.placa})` };
    return { completo: veiculoId || "N/A" };
  }
  function getMotoristaNome(id: string) {
    return motoristasMap.current.get(id)?.nome ?? id ?? "N/A";
  }
  function getRotaNome(id: string) {
    const r = rotasMap.current.get(id);
    return r ? (r.nomeRota || id) : id ?? "N/A";
  }

  function carregarGrafico(alugueres: Aluguer[]) {
    if (!chartRef.current || !(window as any).Chart) return;
    if (chartInstance.current) chartInstance.current.destroy();

    const hoje = new Date();
    const labels: string[] = [];
    const dados: number[] = [];

    for (let i = 30; i >= 0; i--) {
      const d = new Date();
      d.setDate(hoje.getDate() - i);
      labels.push(d.toLocaleDateString("pt-AO", { day: "2-digit", month: "2-digit" }));
      dados.push(0);
    }

    alugueres.forEach((a) => {
      if (a.dataInicio) {
        const di = new Date(a.dataInicio);
        const diff = Math.floor((hoje.getTime() - di.getTime()) / 86400000);
        if (diff >= 0 && diff <= 30) dados[30 - diff]++;
      }
    });

    chartInstance.current = new (window as any).Chart(chartRef.current.getContext("2d"), {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: "Alugueres por Dia",
          data: dados,
          borderColor: "#55a0a6",
          backgroundColor: "rgba(85,160,166,.1)",
          borderWidth: 2, fill: true, tension: 0.4,
          pointBackgroundColor: "#55a0a6",
          pointBorderColor: "#fff",
          pointRadius: 4, pointHoverRadius: 6,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: true,
        plugins: {
          legend: { position: "top" },
          tooltip: { callbacks: { label: (ctx: any) => `${ctx.raw} aluguer(es)` } },
        },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 }, title: { display: true, text: "Número de Alugueres" } },
          x: { title: { display: true, text: "Data" }, ticks: { maxRotation: 45, minRotation: 45, autoSkip: true, maxTicksLimit: 10 } },
        },
      },
    });
  }

  function loadData() {
    const veiculos = veiculosStore.getAll();
    const motoristas = motoristasStore.getAll();
    const rotas = rotasStore.getAll();
    const alugueres = alugueresStore.getAll();

    // Build lookup maps
    veiculos.forEach((v) => veiculosMap.current.set(v.id, v));
    motoristas.forEach((m) => motoristasMap.current.set(m.id, m));
    rotas.forEach((r) => rotasMap.current.set(r.id, r));

    setStats({
      veiculos: veiculos.length,
      motoristas: motoristas.length,
      rotas: rotas.length,
      ativos: alugueres.filter((a) => a.status === "ativo").length,
    });

    const recent = [...alugueres]
      .sort((a, b) => (b.dataInicio ?? "").localeCompare(a.dataInicio ?? ""))
      .slice(0, 10);
    setRecentAlugueres(recent);

    // Chart renders after DOM is painted
    setTimeout(() => carregarGrafico(alugueres), 100);
  }

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <PageHeader icon="bi-speedometer2" title="Dashboard" onMenuToggle={onMenuToggle} onLogout={onLogout} />

      {/* ── Stats row ────────────────────────────────────────────────── */}
      <div className="stats-row" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16 }}>
        {[
          { label: "Total Veículos",   value: stats.veiculos,   icon: "bi-car-front" },
          { label: "Total Motoristas", value: stats.motoristas, icon: "bi-person-badge" },
          { label: "Total Rotas",      value: stats.rotas,      icon: "bi-map" },
          { label: "Alugueres Ativos", value: stats.ativos,     icon: "bi-calendar-check" },
        ].map((s) => (
          <div className="stat-card" key={s.label}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h6 className="text-muted">{s.label}</h6>
                <h3 id={s.label.replace(/ /g, "").toLowerCase()}>{s.value}</h3>
              </div>
              <i className={`bi ${s.icon} stat-icon`} />
            </div>
          </div>
        ))}
      </div>

      {/* ── Chart ───────────────────────────────────────────────────── */}
      <div className="card-box">
        <h5><i className="bi bi-graph-up" /> Atividade de Alugueres (Últimos 30 Dias)</h5>
        <canvas id="activityChart" ref={chartRef} height={100} />
      </div>

      {/* ── Recent alugueres ────────────────────────────────────────── */}
      <div className="card-box" id="recentAlugueres">
        <h5><i className="bi bi-clock-history" /> Alugueres Recentes</h5>

        {recentAlugueres.length === 0 ? (
          <div className="text-center" style={{ padding: "30px", color: "#999" }}>
            <i className="bi bi-inbox" style={{ fontSize: "3rem", color: "#ccc", display: "block", marginBottom: 8 }} />
            Nenhum aluguer registado.
          </div>
        ) : (
          <div className="list-group">
            {recentAlugueres.map((a) => {
              const veiculoInfo = getVeiculoInfo(a.veiculoId);
              const motoristaNome = getMotoristaNome(a.motoristaId ?? "");
              const rotaNome = getRotaNome(a.rotaId ?? "");
              const inicio = a.dataInicio ? new Date(a.dataInicio).toLocaleDateString("pt-AO") : "—";
              const fim = a.dataFimPrevista ? new Date(a.dataFimPrevista).toLocaleDateString("pt-AO") : "—";
              return (
                <div
                  key={a.id}
                  className="list-group-item list-group-item-action"
                  style={{ borderRadius: 8, marginBottom: 6, border: "1px solid #eee", padding: "12px 16px" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 4 }}>
                        <span>
                          <i className="bi bi-car-front" style={{ color: "var(--primary-color)", marginRight: 4 }} />
                          <strong>{veiculoInfo.completo}</strong>
                        </span>
                        <span>
                          <i className="bi bi-person-badge" style={{ marginRight: 4 }} />
                          <small>Motorista: {motoristaNome}</small>
                        </span>
                        {a.rotaId && (
                          <span>
                            <i className="bi bi-map" style={{ marginRight: 4 }} />
                            <small>Rota: {rotaNome}</small>
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: "#888" }}>
                        <i className="bi bi-calendar" style={{ marginRight: 4 }} />
                        {inicio} → {fim}
                      </div>
                    </div>
                    <StatusBadge status={a.status} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Chart.js CDN */}
    </div>
  );
}
