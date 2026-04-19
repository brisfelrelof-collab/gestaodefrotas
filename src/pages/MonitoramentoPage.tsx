// pages/MonitoramentoPage.tsx
import { useEffect, useRef, useState } from "react";
import PageHeader from "../components/PageHeader";
import { StatusBadge, EmptyRow } from "../components/StatusBadge";
import { veiculosStore, alugueresStore, motoristasStore, proprietariosStore } from "../store";
import type { Aluguer, Viatura, Motorista } from "../types";

const VERCEL_GPS_URL = "/api/gps";

interface GpsLive {
  nome:      string;
  lat:       number;
  lng:       number;
  spd:       number;
  fix:       boolean;
  sat:       number;
  alt:       number;
  timestamp: string;
  isTeste?:  boolean;
}

// Cores distintas para cada carro no mapa
const MARKER_COLORS = [
  "#55a0a6", "#e74c3c", "#f39c12", "#27ae60",
  "#8e44ad", "#2980b9", "#d35400", "#16a085",
];

interface MonitoramentoPageProps {
  onMenuToggle: () => void;
  onLogout:     () => void;
  proprietarioId?: string;
}

export default function MonitoramentoPage({ onMenuToggle, onLogout, proprietarioId }: MonitoramentoPageProps) {
  const mapRef        = useRef<HTMLDivElement>(null);
  const leafletMap    = useRef<any>(null);
  const markersRef    = useRef<Record<string, any>>({});
  const colorMapRef   = useRef<Record<string, string>>({});
  const timerRef      = useRef<ReturnType<typeof setInterval> | null>(null);

  const [operacoes,  setOperacoes]  = useState<Aluguer[]>([]);
  const [espHost,    setEspHost]    = useState("http://192.168.43.134");
  const [espStatus,  setEspStatus]  = useState<string>("");
  const [gpsLive,    setGpsLive]    = useState<GpsLive[]>([]);
  const [veiculosList, setVeiculosList] = useState<Viatura[]>([]);
  const [proprietarioNome, setProprietarioNome] = useState<string | null>(null);
  const [proprietarioVehicleTotal, setProprietarioVehicleTotal] = useState<number | null>(null);
  const [motoristasList, setMotoristasList] = useState<Motorista[]>([]);
  const [filtroNome, setFiltroNome] = useState<string>("todos");
  const [layer,      setLayer]      = useState("street");

  const TILES: Record<string, { url: string; attr: string }> = {
    street:    { url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",            attr: "© OpenStreetMap" },
    satellite: { url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", attr: "© Esri" },
    dark:      { url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", attr: "© CARTO" },
    topo:      { url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",              attr: "© OpenTopoMap" },
  };

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function getVeiculoLabel(id: string) {
    const v = veiculosList.find((x) => x.id === id);
    return v ? `${v.marca} ${v.modelo} (${v.placa})` : id;
  }
  function getMotoristaNome(id?: string) {
    if (!id) return "—";
    const m = motoristasList.find((x) => x.id === id);
    return m ? m.nome : id;
  }
  function getCorCarro(nome: string): string {
    if (!colorMapRef.current[nome]) {
      const idx = Object.keys(colorMapRef.current).length % MARKER_COLORS.length;
      colorMapRef.current[nome] = MARKER_COLORS[idx];
    }
    return colorMapRef.current[nome];
  }

  // ── Inicializa mapa ───────────────────────────────────────────────────────────
  function initMap() {
    const L = (window as any).L;
    if (!L || !mapRef.current || leafletMap.current) return;
    leafletMap.current = L.map(mapRef.current, { zoomControl: false })
      .setView([-8.8383, 13.2344], 13);
    const t = TILES[layer];
    L.tileLayer(t.url, { attribution: t.attr, maxZoom: 19 })
      .addTo(leafletMap.current);
    document.getElementById("mapLoading")?.style.setProperty("display", "none");
  }

  function changeLayer(newLayer: string) {
    setLayer(newLayer);
    const L = (window as any).L;
    if (!L || !leafletMap.current) return;
    // remove existing tile layers
    leafletMap.current.eachLayer((l: any) => {
      if (l._url) leafletMap.current.removeLayer(l);
    });
    const t = TILES[newLayer];
    L.tileLayer(t.url, { attribution: t.attr, maxZoom: 19 }).addTo(leafletMap.current);
  }

  // Atualiza marcadores no mapa
  function updateMarkers(positions: GpsLive[], filtro: string) {
    const L = (window as any).L;
    if (!L || !leafletMap.current) return;

    // remove markers for vehicles not present in the current positions list
    const present = new Set(positions.map((p) => p.nome));
    Object.keys(markersRef.current).forEach((nome) => {
      if (!present.has(nome)) {
        try { leafletMap.current.removeLayer(markersRef.current[nome]); } catch {};
        delete markersRef.current[nome];
      }
    });

    // Esconde/mostra marcadores conforme o filtro
    Object.entries(markersRef.current).forEach(([nome, marker]) => {
      if (filtro === "todos" || filtro === nome) {
        marker.addTo(leafletMap.current);
      } else {
        leafletMap.current.removeLayer(marker);
      }
    });

    positions.forEach((pos) => {
      if (!pos.fix) return;
      if (filtro !== "todos" && filtro !== pos.nome) return;

      const cor = getCorCarro(pos.nome);
      const testeBadge = pos.isTeste
        ? `<span style="background:#fce4ec;color:#c62828;padding:1px 7px;border-radius:10px;font-size:10px;margin-left:4px">TESTE</span>`
        : "";

      const popup = `
        <div style="font-family:'Poppins',sans-serif;min-width:210px;padding:4px">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
            <div style="width:12px;height:12px;border-radius:50%;background:${cor};flex-shrink:0"></div>
            <strong style="color:${cor};font-size:14px">${pos.nome}</strong>
            ${testeBadge}
          </div>
          <div style="font-size:12px;line-height:1.8;color:#444">
            <div>📍 <b>Lat:</b> ${pos.lat.toFixed(6)}</div>
            <div>📍 <b>Lng:</b> ${pos.lng.toFixed(6)}</div>
            <div>⚡ <b>Velocidade:</b> ${pos.spd.toFixed(1)} km/h</div>
            <div>🛰️ <b>Satélites:</b> ${pos.sat}</div>
            <div>⏱️ <b>Actualizado:</b> ${new Date(pos.timestamp).toLocaleTimeString("pt-AO")}</div>
          </div>
          <div style="margin-top:8px">
            <span style="background:#fff3cd;color:#856404;padding:3px 10px;border-radius:20px;font-size:11px">
              Em Movimento
            </span>
          </div>
        </div>`;

      if (markersRef.current[pos.nome]) {
        markersRef.current[pos.nome].setLatLng([pos.lat, pos.lng]);
        markersRef.current[pos.nome].setPopupContent(popup);
      } else {
        const icon = L.divIcon({
          className: "",
          html: `
            <div style="
              background:${cor};
              width:38px;height:38px;border-radius:50%;
              display:flex;align-items:center;justify-content:center;
              color:white;font-size:16px;font-weight:bold;
              border:3px solid white;
              box-shadow:0 2px 8px rgba(0,0,0,.35);
              animation:pulse 1.5s infinite;
            ">
              <i class="bi bi-truck"></i>
            </div>`,
          iconSize:   [38, 38],
          iconAnchor: [19, 19],
        });
        markersRef.current[pos.nome] = L.marker([pos.lat, pos.lng], { icon })
          .bindPopup(popup)
          .addTo(leafletMap.current);
      }
    });
  }

  // ── Centra o mapa no carro filtrado ──────────────────────────────────────────
  function centrarNoFiltro(positions: GpsLive[], filtro: string) {
    if (!leafletMap.current) return;
    if (filtro === "todos") {
      // Ajusta o bounds para mostrar todos
      const pts = positions.filter((p) => p.fix);
      if (pts.length > 0) {
        const L = (window as any).L;
        const bounds = L.latLngBounds(pts.map((p) => [p.lat, p.lng]));
        leafletMap.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
      }
    } else {
      const pos = positions.find((p) => p.nome === filtro && p.fix);
      if (pos) leafletMap.current.setView([pos.lat, pos.lng], 16);
    }
  }

  // ── Busca posições do Vercel ──────────────────────────────────────────────────
  async function fetchVercelGps(filtroActual: string) {
    try {
      const res = await fetch(VERCEL_GPS_URL);
      if (!res.ok) return;
      const data: GpsLive[] = await res.json();
      if (Array.isArray(data)) {
        let filtered = data;
        // if viewing a specific proprietor, filter gps positions to that proprietor
        if (proprietarioId) {
          const propId = proprietarioId as string;
          try {
            const prop = await proprietariosStore.getById(propId);
            const pname = prop?.nome ?? null;
            if (pname) {
              setProprietarioNome(pname);
              // prefer matching by normalized name or by id if gps carries id
              const normalize = (s: string) => s.replace(/\s+/g, "").toLowerCase();
              const pn = normalize(pname);
              filtered = data.filter((d) => {
                const ownerRaw = (d as any).proprietario || (d as any).owner || "";
                if (!ownerRaw) return false;
                const on = normalize(ownerRaw + "");
                return on === pn || on.includes(pn) || pn.includes(on) || ownerRaw === propId;
              });
            }
            // compute proprietor total vehicles from viaturas DB (fallback to gps list)
            const propVehicles = await veiculosStore.getByProprietario(propId);
            if (propVehicles && propVehicles.length > 0) setProprietarioVehicleTotal(propVehicles.length);
            else setProprietarioVehicleTotal(filtered.length);
          } catch (e) {
            // ignore
          }
        } else {
          setProprietarioNome(null);
          setProprietarioVehicleTotal(null);
        }

        setGpsLive(filtered);
        updateMarkers(filtered, filtroActual);
      }
    } catch {
      // Sem dados ainda — normal antes do primeiro POST do ESP32
    }
  }

  // ── Conecta directamente ao ESP32 local ──────────────────────────────────────
  async function connectEsp() {
    setEspStatus("A conectar...");
    try {
      const res = await fetch(`${espHost}/gps`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setEspStatus(
        `Local: ${data.lat?.toFixed(5)}, ${data.lng?.toFixed(5)} | ${data.spd?.toFixed(1)} km/h | ${data.sat} sats`
      );
      if (leafletMap.current && data.lat && data.lng) {
        leafletMap.current.setView([data.lat, data.lng], 16);
      }
    } catch (e: any) {
      setEspStatus(`Erro ESP32: ${e.message ?? "Falha na ligação"}`);
    }
  }

  // ── Quando muda o filtro ──────────────────────────────────────────────────────
  function handleFiltroChange(novoFiltro: string) {
    setFiltroNome(novoFiltro);
    updateMarkers(gpsLive, novoFiltro);
    centrarNoFiltro(gpsLive, novoFiltro);
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    let currentFiltro = "todos";

    const init = async () => {
      const [asAll, vs, ms] = await Promise.all([
        alugueresStore.getAll(),
        veiculosStore.getAll(),
        motoristasStore.getAll(),
      ]);
      const as = (asAll as any[]).filter((a) => a.status === "ativo");
      setOperacoes(as as Aluguer[]);
      setVeiculosList(vs as Viatura[]);
      setMotoristasList(ms as Motorista[]);

      const tryInit = () => {
        if ((window as any).L) {
          initMap();
          fetchVercelGps(currentFiltro);
        } else {
          setTimeout(tryInit, 200);
        }
      };
      tryInit();

      // Actualiza a cada 3 segundos
      timerRef.current = setInterval(() => {
        fetchVercelGps(currentFiltro);
      }, 3000);
    };

    void init();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Quando filtroNome muda via state, actualiza a ref para o interval
  useEffect(() => {
    updateMarkers(gpsLive, filtroNome);
    centrarNoFiltro(gpsLive, filtroNome);
  }, [filtroNome]);

  // Nomes disponíveis para o filtro (todos os carros recebidos + operações activas)
  const nomesDisponiveis = Array.from(
    new Set([
      ...gpsLive.map((g: GpsLive) => g.nome),
      ...operacoes.map((a: Aluguer) => veiculosList.find((v) => v.id === ((a as any).viaturaId ?? (a as any).viatura_id ?? ""))?.nome).filter(Boolean) as string[],
    ])
  );

  return (
    <div>
      <PageHeader
        icon="bi-graph-up"
        title="Monitoramento da Frota"
        onMenuToggle={onMenuToggle}
        onLogout={onLogout}
      />

      {/* ── Estatísticas ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))",
          gap: 16,
          marginBottom: 20,
        }}
      >
        {[
          { label: proprietarioId ? "Total de Veículos" : "Veículos online",  value: proprietarioId ? (proprietarioVehicleTotal ?? 0) : gpsLive.filter((g) => g.fix).length,               icon: "bi-broadcast-pin",   cor: "#55a0a6" },
          { label: "Operações activas",value: operacoes.length,                                    icon: "bi-calendar-check",  cor: "#28a745" },
          { label: "Velocidade máx.",  value: gpsLive.length ? Math.max(...gpsLive.map((g) => g.spd)).toFixed(1) + " km/h" : "—", icon: "bi-speedometer2", cor: "#ffc107" },
          { label: "Carros no mapa",   value: Object.keys(markersRef.current).length,              icon: "bi-car-front",       cor: "#e74c3c" },
        ].map((s: { label: string; value: any; icon: string; cor?: string }) => (
          <div className="stat-card" key={s.label} style={{ borderLeftColor: s.cor }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{s.value}</div>
              </div>
              <i className={`bi ${s.icon}`} style={{ fontSize: "2rem", color: s.cor }} />
            </div>
          </div>
        ))}
      </div>

      {/* ── Mapa ── */}
      <div className="table-container" style={{ marginBottom: 20 }}>
        {/* Barra superior */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <h5 style={{ color: "var(--primary-color)", margin: 0 }}>
            <i className="bi bi-geo-alt" /> Localização em Tempo Real
          </h5>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {/* Filtro de carro */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <i className="bi bi-funnel" style={{ color: "var(--primary-color)", fontSize: 14 }} />
              <select
                className="form-select"
                style={{ width: 170, height: 36, fontSize: 13 }}
                value={filtroNome}
                onChange={(e) => handleFiltroChange(e.target.value)}
              >
                <option value="todos">Todos os carros</option>
                {nomesDisponiveis.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>

            {/* ESP32 local */}
            <input
              className="form-control"
              style={{ width: 200, height: 36, fontSize: 12 }}
              placeholder="IP ESP32 local"
              value={espHost}
              onChange={(e) => setEspHost(e.target.value)}
            />
            <button className="btn-outline-custom" onClick={connectEsp}>
              <i className="bi bi-wifi" /> ESP32
            </button>
            <button
              className="btn-outline-custom"
              onClick={() => window.open(`${espHost}/`, "_blank")}
            >
              <i className="bi bi-map" /> Mapa Local
            </button>
          </div>
        </div>

        {/* Status ESP32 */}
        {espStatus && (
          <div style={{ marginBottom: 8, fontSize: 12, color: "#55a0a6" }}>
            <i className="bi bi-broadcast" style={{ marginRight: 4 }} />
            {espStatus}
          </div>
        )}

        {/* Badges de carros online */}
        {gpsLive.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            {gpsLive.map((g: GpsLive) => {
              const cor = getCorCarro(g.nome);
              return (
                <button
                  key={g.nome}
                  onClick={() => handleFiltroChange(g.nome === filtroNome ? "todos" : g.nome)}
                  style={{
                    background: filtroNome === g.nome ? cor : "#f0f0f0",
                    color: filtroNome === g.nome ? "white" : "#444",
                    border: `2px solid ${cor}`,
                    padding: "4px 12px",
                    borderRadius: 20,
                    fontSize: 12,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    fontFamily: "'Poppins',sans-serif",
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: filtroNome === g.nome ? "white" : cor,
                      display: "inline-block",
                    }}
                  />
                  {g.nome}
                  {g.isTeste && (
                    <span style={{ fontSize: 9, opacity: 0.8 }}>(teste)</span>
                  )}
                  &nbsp;{g.spd.toFixed(0)} km/h
                </button>
              );
            })}
          </div>
        )}

        {/* Mapa Leaflet */}
        <div className="map-container" id="map" ref={mapRef}>
          <div id="mapLoading" className="map-loading">
            <i className="bi bi-geo-alt-fill" /> Carregando mapa...
          </div>

          {/* Selector de camada */}
          <div className="layer-dropdown">
            <select value={layer} onChange={(e) => changeLayer(e.target.value)}>
              <option value="street">🌍 OpenStreetMap</option>
              <option value="satellite">🛰️ Satélite</option>
              <option value="dark">🌙 Dark Mode</option>
              <option value="topo">🗺️ Topográfico</option>
            </select>
          </div>

          {/* Controlos de zoom */}
          <div className="map-controls">
            <button onClick={() => leafletMap.current?.zoomIn()}  title="Zoom +">
              <i className="bi bi-plus-lg" />
            </button>
            <button onClick={() => leafletMap.current?.zoomOut()} title="Zoom -">
              <i className="bi bi-dash-lg" />
            </button>
            <button
              onClick={() => {
                setFiltroNome("todos");
                centrarNoFiltro(gpsLive, "todos");
              }}
              title="Ver todos"
            >
              <i className="bi bi-fullscreen" />
            </button>
            <button
              onClick={() => leafletMap.current?.setView([-8.8383, 13.2344], 13)}
              title="Resetar"
            >
              <i className="bi bi-arrow-repeat" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Tabela de operações ── */}
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
              <th><i className="bi bi-geo-alt" /> GPS ao vivo</th>
              <th><i className="bi bi-activity" /> Status</th>
            </tr>
          </thead>
          <tbody>
              {operacoes.length === 0 ? (
              <EmptyRow cols={6} message="Nenhuma operação activa. Adicione alugueres com status 'Ativo'." />
            ) : (
              operacoes.map((a) => {
                const veiculoIdSafe = (a as any).viaturaId ?? (a as any).viatura_id ?? "";
                const veiculo  = veiculosList.find((v) => v.id === veiculoIdSafe);
                const gpsData  = gpsLive.find((g) => g.nome === veiculo?.nome);
                const cor      = veiculo?.nome ? getCorCarro(veiculo.nome) : "#aaa";
                return (
                  <tr key={a.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span
                          style={{
                            width: 10, height: 10, borderRadius: "50%",
                            background: gpsData ? cor : "#ccc",
                            display: "inline-block", flexShrink: 0,
                          }}
                        />
                        <strong>{getVeiculoLabel(veiculoIdSafe)}</strong>
                      </div>
                    </td>
                    <td>{getMotoristaNome(a.motoristaId)}</td>
                    <td>
                      {a.dataInicio
                        ? new Date(a.dataInicio).toLocaleDateString("pt-AO")
                        : "—"}
                    </td>
                    <td>
                      {a.dataFimPrevista
                        ? new Date(a.dataFimPrevista).toLocaleDateString("pt-AO")
                        : "—"}
                    </td>
                    <td>
                      {gpsData ? (
                        <div>
                          <div style={{ fontSize: 12, color: "#28a745", fontWeight: 500 }}>
                            <i
                              className="bi bi-circle-fill"
                              style={{ fontSize: 7, marginRight: 4 }}
                            />
                            {gpsData.lat.toFixed(5)}, {gpsData.lng.toFixed(5)}
                          </div>
                          <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                            ⚡ {gpsData.spd.toFixed(1)} km/h
                            {gpsData.isTeste && (
                              <span
                                style={{
                                  marginLeft: 6,
                                  background: "#fce4ec",
                                  color: "#c62828",
                                  padding: "1px 5px",
                                  borderRadius: 8,
                                  fontSize: 10,
                                }}
                              >
                                teste
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: "#aaa" }}>
                          <i className="bi bi-circle" style={{ fontSize: 7, marginRight: 4 }} />
                          Aguardando GPS...
                        </span>
                      )}
                    </td>
                    <td>
                      <StatusBadge status="em-uso" label="Em Uso" />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Legenda de carros GPS */}
        {gpsLive.length > 0 && (
          <div
            style={{
              marginTop: 16,
              padding: "12px 16px",
              background: "#f8f9fa",
              borderRadius: 10,
              fontSize: 12,
            }}
          >
            <strong style={{ marginBottom: 8, display: "block" }}>
              <i className="bi bi-info-circle" style={{ marginRight: 4 }} />
              Carros recebidos pelo servidor:
            </strong>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {gpsLive.map((g: GpsLive) => (
                <span
                  key={g.nome}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    color: "#444",
                  }}
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: getCorCarro(g.nome),
                      display: "inline-block",
                    }}
                  />
                  <b>{g.nome}</b>
                  {g.isTeste ? " (simulado)" : " (ESP32)"}
                  &nbsp;·&nbsp;{g.spd.toFixed(0)} km/h
                  &nbsp;·&nbsp;
                  {new Date(g.timestamp).toLocaleTimeString("pt-AO")}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}