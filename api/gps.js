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
  isTeste:    false,
  proprietario: 'proprietario1',
};

// Posições em memória — inicia com o carro de teste
const posicoes = {
  automovel1: { ...TEST_CAR },
  // adiciona automoveis 1..7
  automovel2: {
    nome: "automovel2",
    lat: -8.84,
    lng: 13.235,
    spd: 20,
    fix: true,
    sat: 6,
    alt: 55,
    timestamp: new Date().toISOString(),
    isTeste: false,
    proprietario: 'proprietario1',
  },
  automovel3: {
    nome: "automovel3",
    lat: -8.839,
    lng: 13.238,
    spd: 30,
    fix: true,
    sat: 5,
    alt: 50,
    timestamp: new Date().toISOString(),
    isTeste: false,
    proprietario: 'proprietario1',
  },
  automovel4: {
    nome: "automovel4",
    lat: -8.837,
    lng: 13.240,
    spd: 10,
    fix: true,
    sat: 4,
    alt: 45,
    timestamp: new Date().toISOString(),
    isTeste: false,
    proprietario: 'proprietario2',
  },
  automovel5: {
    nome: "automovel5",
    lat: -8.836,
    lng: 13.241,
    spd: 5,
    fix: true,
    sat: 3,
    alt: 40,
    timestamp: new Date().toISOString(),
    isTeste: false,
    proprietario: 'proprietario2',
  },
  automovel6: {
    nome: "automovel6",
    lat: -8.835,
    lng: 13.242,
    spd: 0,
    fix: false,
    sat: 0,
    alt: 0,
    timestamp: new Date().toISOString(),
    isTeste: false,
    proprietario: 'empresa',
  },
  automovel7: {
    nome: "automovel7",
    lat: -8.834,
    lng: 13.243,
    spd: 0,
    fix: false,
    sat: 0,
    alt: 0,
    timestamp: new Date().toISOString(),
    isTeste: false,
    proprietario: 'empresa',
  },
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
    isTeste:    false,
    proprietario: 'proprietario1',
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