// pages/MonitoramentoPage.tsx
import { useEffect, useRef, useState } from "react";
import PageHeader from "../components/PageHeader";
import { StatusBadge, EmptyRow } from "../components/StatusBadge";
import { veiculosStore, alugueresStore, motoristasStore } from "../store";
import type { Veiculo, Aluguer } from "../types";

// URL base do Vercel — usa o domínio actual em produção, localhost em dev
const VERCEL_GPS_URL =
  typeof window !== "undefined" && window.location.hostname !== "localhost"
    ? `${window.location.origin}/api/gps`
    : "/api/gps";

interface GpsLive {
  nome: string;
  lat: number;
  lng: number;
  fix: boolean;
  sat: number;
  spd: number;
  alt: number;
  timestamp: string;
}

interface MonitoramentoPageProps {
  onMenuToggle: () => void;
  onLogout: () => void;
}

export default function MonitoramentoPage({ onMenuToggle, onLogout }: MonitoramentoPageProps) {
  const mapRef     = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  const [operacoes, setOperacoes] = useState<Aluguer[]>([]);
  const [espHost,   setEspHost]   = useState("http://192.168.43.134");
  const [espStatus, setEspStatus] = useState<string>("");
  const [gpsLive,   setGpsLive]   = useState<GpsLive[]>([]);
  const [layer,     setLayer]     = useState("street");

  const TILES: Record<string, { url: string; attr: string }> = {
    street:    { url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",            attr: "© OpenStreetMap" },
    satellite: { url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", attr: "© Esri" },
    dark:      { url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", attr: "© CARTO" },
    topo:      { url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",              attr: "© OpenTopoMap" },
  };

  // Normalize ESP host: ensure protocol and strip any path so we open only the IP/base
  function normalizeEspHost(host: string) {
    let h = host?.trim() ?? "";
    if (!h) return h;
    if (!/^https?:\/\//i.test(h)) h = "http://" + h;
    try {
      const u = new URL(h);
      return `${u.protocol}//${u.hostname}${u.port ? ':' + u.port : ''}`;
    } catch {
      const m = h.match(/^(https?:\/\/[^\/]+)/i);
      return m ? m[1] : h.replace(/\/.*$/, "");
    }
  }

  function getVeiculoLabel(id: string) {
    const v = veiculosStore.getById(id);
    return v ? `${v.marca} ${v.modelo} (${v.placa})` : id;
  }
  function getMotoristaNome(id?: string) {
    if (!id) return "—";
    const m = motoristasStore.getById(id);
    return m ? m.nome : id;
  }

  // ── Inicializa mapa Leaflet ──────────────────────────────────────────────────
  function initMap() {
    const L = (window as any).L;
    if (!L || !mapRef.current || leafletMap.current) return;
    leafletMap.current = L.map(mapRef.current, { zoomControl: false }).setView([-8.8159, 13.2306], 12);
    const t = TILES[layer];
    L.tileLayer(t.url, { attribution: t.attr, maxZoom: 19 }).addTo(leafletMap.current);
    document.getElementById("mapLoading")?.style.setProperty("display", "none");
  }

  function changeLayer(newLayer: string) {
    setLayer(newLayer);
    const L = (window as any).L;
    if (!L || !leafletMap.current) return;
    leafletMap.current.eachLayer((l: any) => { if (l._url) leafletMap.current.removeLayer(l); });
    const t = TILES[newLayer];
    L.tileLayer(t.url, { attribution: t.attr, maxZoom: 19 }).addTo(leafletMap.current);
  }

  // ── Coloca/actualiza marcadores com dados reais do Vercel ────────────────────
  function updateMarkersFromVercel(positions: GpsLive[]) {
    const L = (window as any).L;
    if (!L || !leafletMap.current) return;

    positions.forEach((pos) => {
      if (!pos.fix) return;

      const popup = `
        <div style="font-family:'Poppins',sans-serif;min-width:200px">
          <h6 style="color:#55a0a6;margin-bottom:6px">
            <i class="bi bi-truck"></i> ${pos.nome}
          </h6>
          <p style="margin:2px 0;font-size:12px">📍 ${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}</p>
          <p style="margin:2px 0;font-size:12px">🛰️ ${pos.sat} satélites</p>
          <p style="margin:2px 0;font-size:12px">⚡ ${pos.spd.toFixed(1)} km/h</p>
          <p style="margin:2px 0;font-size:12px">⏱️ ${new Date(pos.timestamp).toLocaleTimeString("pt-AO")}</p>
          <span style="background:#fff3cd;color:#856404;padding:2px 8px;border-radius:20px;font-size:11px">
            Em Movimento
          </span>
        </div>`;

      if (markersRef.current[pos.nome]) {
        // Actualiza posição do marcador existente
        markersRef.current[pos.nome].setLatLng([pos.lat, pos.lng]);
        markersRef.current[pos.nome].setPopupContent(popup);
      } else {
        // Cria novo marcador
        const icon = L.divIcon({
          className: "",
          html: `<div class="vehicle-marker"><i class="bi bi-truck"></i></div>`,
          iconSize: [40, 40], iconAnchor: [20, 20],
        });
        markersRef.current[pos.nome] = L.marker([pos.lat, pos.lng], { icon })
          .bindPopup(popup)
          .addTo(leafletMap.current);
      }
    });
  }

  // ── Coloca marcadores simulados para viaturas sem GPS activo ─────────────────
  function updateMarkersSimulated(as: Aluguer[]) {
    const L = (window as any).L;
    if (!L || !leafletMap.current || as.length === 0) return;

    as.forEach((a, i) => {
      const key = `sim_${a.id}`;
      if (markersRef.current[key]) return; // já existe
      const lat = -8.8159 + Math.sin(i * 1.7) * 0.05;
      const lng = 13.2306 + Math.cos(i * 1.7) * 0.05;
      const icon = L.divIcon({
        className: "",
        html: `<div class="vehicle-marker" style="opacity:.5"><i class="bi bi-truck"></i></div>`,
        iconSize: [40, 40], iconAnchor: [20, 20],
      });
      markersRef.current[key] = L.marker([lat, lng], { icon })
        .bindPopup(`<b>${getVeiculoLabel(a.veiculoId)}</b><br><small>Posição simulada</small>`)
        .addTo(leafletMap.current);
    });
  }

  // ── Busca posições GPS do Vercel ─────────────────────────────────────────────
  async function fetchVercelGps() {
    try {
      const res = await fetch(VERCEL_GPS_URL);
      if (!res.ok) return;
      const data: GpsLive[] = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setGpsLive(data);
        updateMarkersFromVercel(data);
      }
    } catch {
      // sem dados do Vercel ainda — normal antes do ESP32 enviar
    }
  }

  // ── Conecta directamente ao ESP32 (rede local) ────────────────────────────────
  async function connectEsp() {
    setEspStatus("A conectar...");
    try {
      const base = normalizeEspHost(espHost);
      const res = await fetch(`${base}/gps`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setEspStatus(
        `GPS Local: Lat ${data.lat?.toFixed(6)}, Lng ${data.lng?.toFixed(6)} | ${data.spd?.toFixed(1)} km/h | ${data.sat} sats`
      );
      const L = (window as any).L;
      if (L && leafletMap.current && data.lat && data.lng) {
        leafletMap.current.setView([data.lat, data.lng], 16);
      }
    } catch (e: any) {
      setEspStatus(`Erro ESP32: ${e.message ?? "Falha na ligação"}`);
    }
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const as = alugueresStore.getAll().filter((a) => a.status === "ativo");
    setOperacoes(as);

    const tryInit = () => {
      if ((window as any).L) {
        initMap();
        updateMarkersSimulated(as);
        fetchVercelGps();
      } else {
        setTimeout(tryInit, 200);
      }
    };
    tryInit();

    // Actualiza posições GPS do Vercel a cada 5 segundos
    timerRef.current = setInterval(fetchVercelGps, 5000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  return (
    <div>
      <PageHeader icon="bi-graph-up" title="Monitoramento da Frota" onMenuToggle={onMenuToggle} onLogout={onLogout} />

      {/* Operações em tempo real */}
      <div className="info-card">
        <h6 className="text-muted" style={{ marginBottom: 6 }}>Operações em Tempo Real</h6>
        <h3 id="operacoesCount">{operacoes.length}</h3>
        <small className="auto-refresh">
          <i className="bi bi-arrow-repeat" /> Actualizando GPS do Vercel a cada 5 segundos
        </small>
      </div>

      {/* Mapa */}
      <div className="table-container" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
          <h5 style={{ color: "var(--primary-color)", margin: 0 }}>
            <i className="bi bi-geo-alt" /> Localização em Tempo Real
          </h5>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input
              className="form-control"
              style={{ width: 230, height: 36, fontSize: 13 }}
              placeholder="ESP32 local (ex: http://192.168.4.1)"
              value={espHost}
              onChange={(e) => setEspHost(e.target.value)}
            />
            <button className="btn-outline-custom" onClick={connectEsp}>
              <i className="bi bi-wifi" /> Conectar ESP32 Local
            </button>
            <button className="btn-outline-custom" onClick={() => window.open(normalizeEspHost(espHost), "_blank")}>
              <i className="bi bi-map" /> Mapa ESP32
            </button>
          </div>
        </div>

        {/* Status ESP / Vercel */}
        {espStatus && (
          <div style={{ marginBottom: 8, fontSize: 12, color: "#55a0a6" }}>
            <i className="bi bi-broadcast" style={{ marginRight: 4 }} /> {espStatus}
          </div>
        )}
        {gpsLive.length > 0 && (
          <div style={{ marginBottom: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {gpsLive.map((g) => (
              <span key={g.nome} style={{ background: "#d4edda", color: "#155724", padding: "3px 10px", borderRadius: 20, fontSize: 12 }}>
                <i className="bi bi-geo-alt-fill" style={{ marginRight: 4 }} />
                {g.nome} — {g.lat.toFixed(5)}, {g.lng.toFixed(5)} | {g.spd.toFixed(1)} km/h
              </span>
            ))}
          </div>
        )}

        <div className="map-container" id="map" ref={mapRef}>
          <div id="mapLoading" className="map-loading">
            <i className="bi bi-geo-alt-fill" /> Carregando mapa...
          </div>
          <div className="layer-dropdown">
            <select value={layer} onChange={(e) => changeLayer(e.target.value)}>
              <option value="street">🌍 OpenStreetMap</option>
              <option value="satellite">🛰️ Satélite</option>
              <option value="dark">🌙 Dark Mode</option>
              <option value="topo">🗺️ Topográfico</option>
            </select>
          </div>
          <div className="map-controls">
            <button onClick={() => leafletMap.current?.zoomIn()}  title="Aumentar zoom"><i className="bi bi-plus-lg" /></button>
            <button onClick={() => leafletMap.current?.zoomOut()} title="Diminuir zoom"><i className="bi bi-dash-lg" /></button>
            <button onClick={() => leafletMap.current?.setView([-8.8159, 13.2306], 12)} title="Resetar"><i className="bi bi-arrow-repeat" /></button>
          </div>
        </div>
      </div>

      {/* Tabela de operações */}
      <div className="table-container">
        <h5 style={{ color: "var(--primary-color)", marginBottom: 15 }}>
          <i className="bi bi-broadcast" /> Operações em Tempo Real
        </h5>
        <table className="table-custom">
          <thead>
            <tr>
              <th><i className="bi bi-car-front" /> Veículo</th>
              <th><i className="bi bi-person-badge" /> Motorista</th>
              <th><i className="bi bi-clock" /> Início</th>
              <th><i className="bi bi-flag-checkered" /> Previsão Término</th>
              <th><i className="bi bi-geo-alt" /> GPS Vercel</th>
              <th><i className="bi bi-activity" /> Status</th>
            </tr>
          </thead>
          <tbody>
            {operacoes.length === 0 ? (
              <EmptyRow cols={6} message="Nenhuma operação em curso." />
            ) : operacoes.map((a) => {
              // Tenta encontrar dados GPS reais desta viatura
              const veiculo = veiculosStore.getById(a.veiculoId);
              const gpsData = gpsLive.find((g) => g.nome === veiculo?.nome);
              return (
                <tr key={a.id}>
                  <td><strong>{getVeiculoLabel(a.veiculoId)}</strong></td>
                  <td>{getMotoristaNome(a.motoristaId)}</td>
                  <td>{a.dataInicio ? new Date(a.dataInicio).toLocaleDateString("pt-AO") : "—"}</td>
                  <td>{a.dataFimPrevista ? new Date(a.dataFimPrevista).toLocaleDateString("pt-AO") : "—"}</td>
                  <td>
                    {gpsData ? (
                      <span style={{ fontSize: 12, color: "#28a745" }}>
                        <i className="bi bi-circle-fill" style={{ fontSize: 8, marginRight: 4 }} />
                        {gpsData.lat.toFixed(5)}, {gpsData.lng.toFixed(5)}
                        <br />
                        <small style={{ color: "#888" }}>{gpsData.spd.toFixed(1)} km/h · {gpsData.sat} sats</small>
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, color: "#aaa" }}>
                        <i className="bi bi-circle" style={{ fontSize: 8, marginRight: 4 }} />
                        Aguardando GPS...
                      </span>
                    )}
                  </td>
                  <td><StatusBadge status="em-uso" label="Em Uso" /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
