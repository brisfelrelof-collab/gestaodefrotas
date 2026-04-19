// api/gps.js
// Vercel Serverless Function
// POST — ESP32 envia localização
// GET  — frontend busca todas as posições (ou uma específica)

// Posições em memória — apenas guarda leituras reais recebidas via POST do ESP32.
// Não inicializamos com valores simulados: só atualizamos quando o ESP32 enviar dados.
const posicoes = {};

// Sem simulação: removida função de actualização simulada.

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // ── POST — ESP32 envia posição ────────────────────────────────────────────────
  if (req.method === "POST") {
    const { nome: rawNome, lat, lng, spd, fix, sat, alt } = req.body;

    // Normaliza nomes para o padrão 'viatura' (ex.: automove1/automovel1 -> viatura1)
    const normalizeNome = (n) => {
      if (!n) return n;
      // aceita prefixes como 'automov', 'automove', 'automovel' e normaliza para 'viatura'
      return String(n).replace(/^automov(?:el|e)?/i, "viatura");
    };
    const nome = normalizeNome(String(rawNome));

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
    const { nome: qNome } = req.query;
    const normalizeNome = (n) => {
      if (!n) return n;
      return String(n).replace(/^automov(?:el|e)?/i, "viatura");
    };
    const nome = qNome ? normalizeNome(qNome) : undefined;

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