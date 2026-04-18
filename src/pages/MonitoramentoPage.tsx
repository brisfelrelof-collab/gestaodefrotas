// pages/MonitoramentoPage.tsx
import { useEffect, useRef, useState } from "react";
import PageHeader from "../components/PageHeader";
import { StatusBadge, EmptyRow } from "../components/StatusBadge";
import { veiculosStore, alugueresStore, motoristasStore } from "../store";
import type { Veiculo, Aluguer, Motorista } from "../types";

interface MonitoramentoPageProps {
  onMenuToggle: () => void;
  onLogout: () => void;
}

export default function MonitoramentoPage({ onMenuToggle, onLogout }: MonitoramentoPageProps) {
  const mapRef        = useRef<HTMLDivElement>(null);
  const leafletMap    = useRef<any>(null);
  const markersRef    = useRef<any[]>([]);
  const timerRef      = useRef<ReturnType<typeof setInterval> | null>(null);

  const [veiculos,   setVeiculos]   = useState<Veiculo[]>([]);
  const [operacoes,  setOperacoes]  = useState<Aluguer[]>([]);
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [espHost,    setEspHost]    = useState("http://192.168.43.134");
  const [espStatus,  setEspStatus]  = useState<string>("");
  const [layer,      setLayer]      = useState("street");

  // tile providers
  const TILES: Record<string, { url: string; attr: string }> = {
    street:    { url:"https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",           attr:"© OpenStreetMap" },
    satellite: { url:"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", attr:"© Esri" },
    dark:      { url:"https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", attr:"© CARTO" },
    topo:      { url:"https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",              attr:"© OpenTopoMap" },
  };

  // ── Load data ────────────────────────────────────────────────────────────────
  function loadData() {
    const vs = veiculosStore.getAll();
    const ms = motoristasStore.getAll();
    const as = alugueresStore.getAll().filter((a) => a.status === "ativo");
    setVeiculos(vs);
    setMotoristas(ms);
    setOperacoes(as);
    return { vs, ms, as };
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function getVeiculoLabel(id: string) {
    const v = veiculosStore.getById(id);
    return v ? `${v.marca} ${v.modelo} (${v.placa})` : id;
  }
  function getMotoristaNome(id?: string) {
    if (!id) return "—";
    const m = motoristasStore.getById(id);
    return m ? m.nome : id;
  }

  // ── Initialise Leaflet map ───────────────────────────────────────────────────
  function initMap() {
    const L = (window as any).L;
    if (!L || !mapRef.current || leafletMap.current) return;

    leafletMap.current = L.map(mapRef.current, { zoomControl: false }).setView([-8.8159, 13.2306], 12);

    const t = TILES[layer];
    L.tileLayer(t.url, { attribution: t.attr, maxZoom: 19 }).addTo(leafletMap.current);

    document.getElementById("mapLoading")?.style.setProperty("display","none");
  }

  function changeLayer(newLayer: string) {
    setLayer(newLayer);
    const L = (window as any).L;
    if (!L || !leafletMap.current) return;
    leafletMap.current.eachLayer((l: any) => { if (l._url) leafletMap.current.removeLayer(l); });
    const t = TILES[newLayer];
    L.tileLayer(t.url, { attribution: t.attr, maxZoom: 19 }).addTo(leafletMap.current);
  }

  // ── Place markers ────────────────────────────────────────────────────────────
  function updateMarkers(as: Aluguer[]) {
    const L = (window as any).L;
    if (!L || !leafletMap.current) return;

    markersRef.current.forEach((m) => leafletMap.current.removeLayer(m));
    markersRef.current = [];

    as.forEach((a, i) => {
      // Simulate position near Luanda for demo
      const lat = -8.8159 + (Math.sin(i * 1.7 + Date.now() / 60000) * 0.05);
      const lng = 13.2306 + (Math.cos(i * 1.7 + Date.now() / 60000) * 0.05);

      const icon = L.divIcon({
        className:"",
        html:`<div class="vehicle-marker"><i class="bi bi-truck"></i></div>`,
        iconSize:[40,40], iconAnchor:[20,20],
      });

      const popup = `
        <div style="font-family:'Poppins',sans-serif;min-width:200px">
          <h6 style="color:#55a0a6;margin-bottom:6px"><i class="bi bi-car-front"></i> ${getVeiculoLabel(a.veiculoId)}</h6>
          <p style="margin:2px 0;font-size:12px"><i class="bi bi-person-badge"></i> ${getMotoristaNome(a.motoristaId)}</p>
          <p style="margin:2px 0;font-size:12px"><i class="bi bi-clock"></i> Início: ${a.dataInicio ? new Date(a.dataInicio).toLocaleDateString("pt-AO") : "—"}</p>
          <span style="background:#fff3cd;color:#856404;padding:2px 8px;border-radius:20px;font-size:11px">Em Uso</span>
        </div>`;

      const marker = L.marker([lat, lng], { icon })
        .bindPopup(popup)
        .addTo(leafletMap.current);
      markersRef.current.push(marker);
    });
  }

  // ── Connect ESP GPS ───────────────────────────────────────────────────────────
  async function connectEsp() {
    setEspStatus("A conectar...");
    try {
      const res = await fetch(`${espHost}/gps`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setEspStatus(`GPS: Lat ${data.lat?.toFixed(6)}, Lng ${data.lng?.toFixed(6)} | Vel: ${data.speed ?? "—"} km/h`);

      const L = (window as any).L;
      if (L && leafletMap.current && data.lat && data.lng) {
        leafletMap.current.setView([data.lat, data.lng], 15);
      }
    } catch (e: any) {
      setEspStatus(`Erro: ${e.message ?? "Falha na ligação ao ESP"}`);
    }
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const { as } = loadData();

    // Wait for Leaflet CDN to load
    const tryInit = () => {
      if ((window as any).L) { initMap(); updateMarkers(as); }
      else setTimeout(tryInit, 200);
    };
    tryInit();

    timerRef.current = setInterval(() => {
      const { as: fresh } = loadData();
      updateMarkers(fresh);
    }, 10000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <div>
      <PageHeader icon="bi-graph-up" title="Monitoramento da Frota" onMenuToggle={onMenuToggle} onLogout={onLogout} />

      {/* Operations count */}
      <div className="info-card">
        <h6 className="text-muted" style={{ marginBottom:6 }}>Operações em Tempo Real</h6>
        <h3 id="operacoesCount">{operacoes.length}</h3>
        <small className="auto-refresh">
          <i className="bi bi-arrow-repeat" /> Actualizando automaticamente a cada 10 segundos
        </small>
      </div>

      {/* Map */}
      <div className="table-container" style={{ marginBottom:20 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12, flexWrap:"wrap", gap:10 }}>
          <h5 style={{ color:"var(--primary-color)", margin:0 }}>
            <i className="bi bi-geo-alt" /> Localização dos Veículos em Operação
          </h5>
          <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
            <input
              id="espHostInput"
              className="form-control"
              style={{ width:220, height:36, fontSize:13 }}
              placeholder="ESP32 host (ex: http://192.168.4.1)"
              value={espHost}
              onChange={(e) => setEspHost(e.target.value)}
            />
            <button className="btn-outline-custom" id="connectEspBtn" onClick={connectEsp}>
              Conectar GPS
            </button>
            <button className="btn-outline-custom" id="openEspMapBtn"
              onClick={() => window.open(`${espHost}/map`, "_blank")} title="Abrir mapa do ESP32">
              Abrir Mapa
            </button>
          </div>
        </div>

        {espStatus && (
          <div id="espStatusBar" style={{ marginBottom:8 }}>
            <small id="espStatusText" style={{ color:"#666" }}>
              <i className="bi bi-wifi" style={{ marginRight:4 }} />{espStatus}
            </small>
          </div>
        )}

        <div className="map-container" id="map" ref={mapRef}>
          <div id="mapLoading" className="map-loading">
            <i className="bi bi-geo-alt-fill" /> Carregando mapa...
          </div>

          {/* Layer selector */}
          <div className="layer-dropdown">
            <select id="layerSelect" value={layer} onChange={(e) => changeLayer(e.target.value)}>
              <option value="street">🌍 OpenStreetMap</option>
              <option value="satellite">🛰️ Satélite</option>
              <option value="dark">🌙 Dark Mode</option>
              <option value="topo">🗺️ Topográfico</option>
            </select>
          </div>

          {/* Zoom controls */}
          <div className="map-controls">
            <button id="zoomInBtn"  title="Aumentar zoom"       onClick={() => leafletMap.current?.zoomIn()}><i className="bi bi-plus-lg" /></button>
            <button id="zoomOutBtn" title="Diminuir zoom"       onClick={() => leafletMap.current?.zoomOut()}><i className="bi bi-dash-lg" /></button>
            <button id="resetViewBtn" title="Resetar visualização" onClick={() => leafletMap.current?.setView([-8.8159, 13.2306], 12)}><i className="bi bi-arrow-repeat" /></button>
          </div>
        </div>

        {/* Leaflet & BI icons CDN */}
      </div>

      {/* Operations table */}
      <div className="table-container">
        <h5 style={{ color:"var(--primary-color)", marginBottom:15 }}>
          <i className="bi bi-broadcast" /> Operações em Tempo Real
        </h5>
        <div className="table-responsive">
          <table className="table-custom">
            <thead>
              <tr>
                <th><i className="bi bi-car-front" /> Veículo</th>
                <th><i className="bi bi-person-badge" /> Motorista</th>
                <th><i className="bi bi-clock" /> Início</th>
                <th><i className="bi bi-flag-checkered" /> Previsão Término</th>
                <th><i className="bi bi-activity" /> Status</th>
              </tr>
            </thead>
            <tbody id="operacoesTempoReal">
              {operacoes.length === 0 ? (
                <EmptyRow cols={5} message="Nenhuma operação em curso." />
              ) : operacoes.map((a) => (
                <tr key={a.id}>
                  <td><strong>{getVeiculoLabel(a.veiculoId)}</strong></td>
                  <td>{getMotoristaNome(a.motoristaId)}</td>
                  <td>{a.dataInicio ? new Date(a.dataInicio).toLocaleDateString("pt-AO") : "—"}</td>
                  <td>{a.dataFimPrevista ? new Date(a.dataFimPrevista).toLocaleDateString("pt-AO") : "—"}</td>
                  <td><StatusBadge status="em-uso" label="Em Uso" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
