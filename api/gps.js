// api/gps.js
// Vercel Serverless Function
// POST — ESP32 envia localização
// GET  — frontend busca todas as posições (ou uma específica)

// ── Carro de teste fixo ────────────────────────────────────────────────────────
// Simula movimento em Luanda para o automovel1 aparecer no mapa imediatamente.
// Quando o ESP32 real enviar dados, substitui estes valores automaticamente.
const TEST_CAR = {
  nome:      "automovel1",
  lat:       -8.8383,
  lng:        13.2344,
  spd:        45.0,
  fix:        true,
  sat:        8,
  alt:        60.0,
  timestamp:  new Date().toISOString(),
  isTeste:    true,   // flag para o frontend mostrar "(teste)"
};

// Posições em memória — inicia com o carro de teste
const posicoes = {
  automovel1: { ...TEST_CAR },
};

// Actualiza a posição simulada do carro de teste a cada requisição
// para parecer que está em movimento (percorre um pequeno círculo)
let testAngle = 0;
function actualizarCarroTeste() {
  testAngle += 0.05;
  posicoes["automovel1"] = {
    nome:      "automovel1",
    lat:       -8.8383 + Math.sin(testAngle) * 0.008,
    lng:        13.2344 + Math.cos(testAngle) * 0.008,
    spd:        Math.abs(Math.sin(testAngle) * 60),
    fix:        true,
    sat:        7 + Math.floor(Math.abs(Math.sin(testAngle)) * 3),
    alt:        60.0,
    timestamp:  new Date().toISOString(),
    isTeste:    true,
  };
}

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // ── POST — ESP32 envia posição ────────────────────────────────────────────────
  if (req.method === "POST") {
    const { nome, lat, lng, spd, fix, sat, alt } = req.body;

    if (!nome || lat === undefined || lng === undefined) {
      return res.status(400).json({ error: "Campos obrigatórios: nome, lat, lng" });
    }

    posicoes[nome] = {
      nome,
      lat:       parseFloat(lat),
      lng:       parseFloat(lng),
      spd:       parseFloat(spd)  || 0,
      fix:       fix === true || fix === "true",
      sat:       parseInt(sat)    || 0,
      alt:       parseFloat(alt)  || 0,
      timestamp: new Date().toISOString(),
      isTeste:   false,
    };

    console.log(`[GPS] ${nome} → lat=${lat} lng=${lng} spd=${spd}km/h`);
    return res.status(200).json({ ok: true, saved: posicoes[nome] });
  }

  // ── GET — frontend pede posições ─────────────────────────────────────────────
  if (req.method === "GET") {
    // Avança a simulação do carro de teste
    actualizarCarroTeste();

    const { nome } = req.query;

    // GET /api/gps?nome=viatura1  →  devolve apenas essa viatura
    if (nome) {
      const pos = posicoes[nome];
      if (!pos) {
        return res.status(404).json({ error: `Sem dados para '${nome}'` });
      }
      return res.status(200).json(pos);
    }

    // GET /api/gps  →  devolve todas
    return res.status(200).json(Object.values(posicoes));
  }

  return res.status(405).json({ error: "Método não permitido" });
}