// api/gps.js  —  Vercel Serverless Function
//
// POST /api/gps  ← ESP32 envia posição
//   body JSON: { nome, lat, lng, spd, fix, sat?, alt? }
//
// GET  /api/gps         ← devolve todas as viaturas
// GET  /api/gps?nome=x  ← devolve apenas a viatura pedida
//
// Nota: os dados vivem em memória. Em produção, substitua
// `posicoes` por uma base de dados (Supabase, Redis, etc.)
// para persistência entre instâncias serverless.

const posicoes = {};

// Normaliza nomes: automov*/automovel* → viatura*
function normalizeNome(n) {
  if (!n) return n;
  return String(n)
    .trim()
    .replace(/^automov(?:el|e)?/i, 'viatura');
}

export default function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── POST — ESP32 envia posição ────────────────────────
  if (req.method === 'POST') {
    const {
      nome: rawNome,
      lat, lng,
      spd = 0,
      fix = false,
      sat = 0,
      alt = 0,
    } = req.body ?? {};

    if (!rawNome || lat === undefined || lng === undefined) {
      return res.status(400).json({
        error: 'Campos obrigatórios: nome, lat, lng',
      });
    }

    const nome = normalizeNome(rawNome);
    const entry = {
      nome,
      lat:       parseFloat(lat),
      lng:       parseFloat(lng),
      spd:       parseFloat(spd)  || 0,
      fix:       fix === true || fix === 'true',
      sat:       parseInt(sat)    || 0,
      alt:       parseFloat(alt)  || 0,
      timestamp: new Date().toISOString(),
    };

    posicoes[nome] = entry;

    console.log(
      `[GPS] POST  ${nome}  lat=${entry.lat}  lng=${entry.lng}  spd=${entry.spd}km/h  fix=${entry.fix}`
    );

    return res.status(200).json({ ok: true, saved: entry });
  }

  // ── GET — frontend lê posições ────────────────────────
  if (req.method === 'GET') {
    const nome = req.query?.nome
      ? normalizeNome(req.query.nome)
      : undefined;

    if (nome) {
      const pos = posicoes[nome];
      if (!pos) {
        return res.status(404).json({ error: `Sem dados para '${nome}'` });
      }
      return res.status(200).json(pos);
    }

    // Devolve todas as viaturas como array
    return res.status(200).json(Object.values(posicoes));
  }

  return res.status(405).json({ error: 'Método não permitido' });
}