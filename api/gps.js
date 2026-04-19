// api/gps.js  —  Vercel Serverless Function
// POST  →  ESP32 envia localização  →  salva no Neon PostgreSQL
// GET   →  frontend busca posições  →  lê do PostgreSQL + fallback último ponto

import { Pool } from "@neondatabase/serverless";

function getPool() {
  return new Pool({ connectionString: process.env.DATABASE_URL });
}

// Normaliza nomes: automov*/automovel* → viatura*
function normalizeNome(n) {
  if (!n) return n;
  return String(n).replace(/^automov(?:el|e)?/i, "viatura");
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const pool = getPool();

  try {
    // ── POST — ESP32 envia posição ──────────────────────────────────────────
    if (req.method === "POST") {
      const { nome: rawNome, lat, lng, spd, fix, sat, alt } = req.body;
      const nome = normalizeNome(String(rawNome ?? ""));

      if (!nome || lat === undefined || lng === undefined) {
        return res.status(400).json({ error: "Campos obrigatórios: nome, lat, lng" });
      }

      const latF = parseFloat(lat);
      const lngF = parseFloat(lng);
      const spdF = parseFloat(spd) || 0;
      const satI = parseInt(sat)   || 0;
      const altF = parseFloat(alt) || 0;
      const fixB = fix === true || fix === "true";

      // Upsert: insere ou actualiza a posição da viatura
      await pool.query(
        `INSERT INTO gps_posicoes (nome, lat, lng, spd, fix, sat, alt, timestamp, is_teste)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), false)
         ON CONFLICT (nome)
         DO UPDATE SET
           lat       = EXCLUDED.lat,
           lng       = EXCLUDED.lng,
           spd       = EXCLUDED.spd,
           fix       = EXCLUDED.fix,
           sat       = EXCLUDED.sat,
           alt       = EXCLUDED.alt,
           timestamp = NOW()`,
        [nome, latF, lngF, spdF, fixB, satI, altF]
      );

      // Histórico (guarda cada leitura para rastreio de rota)
      await pool.query(
        `INSERT INTO gps_historico (nome, lat, lng, spd, sat, alt, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [nome, latF, lngF, spdF, satI, altF]
      );

      console.log(`[GPS] ${nome} → lat=${latF} lng=${lngF} spd=${spdF}km/h`);
      return res.status(200).json({ ok: true });
    }

    // ── GET — frontend pede posições ────────────────────────────────────────
    if (req.method === "GET") {
      const { nome: qNome } = req.query;
      const nome = qNome ? normalizeNome(qNome) : null;

      // Calcula "online" = recebido nos últimos 10 segundos
      const ONLINE_SEC = 10;

      if (nome) {
        const { rows } = await pool.query(
          `SELECT nome, lat, lng, spd, fix, sat, alt, timestamp, is_teste,
                  (NOW() - timestamp) < INTERVAL '${ONLINE_SEC} seconds' AS online
           FROM gps_posicoes WHERE nome = $1`,
          [nome]
        );
        if (rows.length === 0)
          return res.status(404).json({ error: `Sem dados para '${nome}'` });
        return res.status(200).json(mapRow(rows[0]));
      }

      // Devolve todas as viaturas (posição actual + flag online)
      const { rows } = await pool.query(
        `SELECT nome, lat, lng, spd, fix, sat, alt, timestamp, is_teste,
                (NOW() - timestamp) < INTERVAL '${ONLINE_SEC} seconds' AS online
         FROM gps_posicoes ORDER BY nome`
      );
      return res.status(200).json(rows.map(mapRow));
    }

    return res.status(405).json({ error: "Método não permitido" });
  } catch (err) {
    console.error("[GPS] DB error:", err.message);
    return res.status(500).json({ error: "Erro interno: " + err.message });
  } finally {
    await pool.end();
  }
}

function mapRow(r) {
  return {
    nome:      r.nome,
    lat:       parseFloat(r.lat),
    lng:       parseFloat(r.lng),
    spd:       parseFloat(r.spd),
    fix:       r.fix,
    sat:       r.sat,
    alt:       parseFloat(r.alt),
    timestamp: r.timestamp,
    isTeste:   r.is_teste,
    online:    r.online,   // ← true = recebido < 10s atrás
  };
}
