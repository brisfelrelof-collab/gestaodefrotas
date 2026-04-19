// api/db.js  —  CRUD genérico para todas as tabelas via Neon PostgreSQL
// Substitui completamente o Supabase client.
// Endpoint: /api/db?table=viaturas&action=getAll  etc.

import { Pool } from "@neondatabase/serverless";

const ALLOWED_TABLES = [
  "users", "proprietarios", "motoristas", "viaturas",
  "servicos", "transacoes", "usuarios_clientes", "rotas",
];

function getPool() {
  return new Pool({ connectionString: process.env.DATABASE_URL });
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { table, action, id, filter_col, filter_val } = req.query;

  if (!ALLOWED_TABLES.includes(table)) {
    return res.status(400).json({ error: `Tabela '${table}' não permitida.` });
  }

  const pool = getPool();
  try {
    // ── GET (selectAll / selectOne / selectByField) ─────────────────────────
    if (req.method === "GET") {
      if (id) {
        const { rows } = await pool.query(
          `SELECT * FROM ${table} WHERE id = $1 LIMIT 1`, [id]
        );
        if (rows.length === 0) return res.status(404).json(null);
        return res.status(200).json(rows[0]);
      }
      if (filter_col && filter_val) {
        const { rows } = await pool.query(
          `SELECT * FROM ${table} WHERE ${filter_col} = $1 ORDER BY created_at DESC`, [filter_val]
        );
        return res.status(200).json(rows);
      }
      const { rows } = await pool.query(
        `SELECT * FROM ${table} ORDER BY created_at DESC`
      );
      return res.status(200).json(rows);
    }

    // ── POST (insert) ──────────────────────────────────────────────────────
    if (req.method === "POST") {
      const body = req.body;
      if (!body || Object.keys(body).length === 0)
        return res.status(400).json({ error: "Body vazio." });

      const cols   = Object.keys(body);
      const vals   = Object.values(body);
      const placeh = cols.map((_, i) => `$${i + 1}`);

      // Se não tem id, gera UUID
      if (!body.id) {
        cols.push("id");
        vals.push(`${crypto.randomUUID()}`);
        placeh.push(`$${vals.length}`);
      }

      const { rows } = await pool.query(
        `INSERT INTO ${table} (${cols.join(",")}) VALUES (${placeh.join(",")})
         ON CONFLICT (id) DO UPDATE SET ${cols.filter(c => c !== "id").map((c, i) => `${c}=EXCLUDED.${c}`).join(",")}
         RETURNING *`,
        vals
      );
      return res.status(201).json(rows[0]);
    }

    // ── PUT (update by id) ────────────────────────────────────────────────
    if (req.method === "PUT") {
      if (!id) return res.status(400).json({ error: "id obrigatório para update." });
      const body = req.body;
      const cols = Object.keys(body).filter(k => k !== "id");
      const vals = cols.map(k => body[k]);
      const sets = cols.map((c, i) => `${c} = $${i + 1}`);
      vals.push(id);
      const { rows } = await pool.query(
        `UPDATE ${table} SET ${sets.join(", ")} WHERE id = $${vals.length} RETURNING *`,
        vals
      );
      if (rows.length === 0) return res.status(404).json({ error: "Não encontrado." });
      return res.status(200).json(rows[0]);
    }

    // ── DELETE ────────────────────────────────────────────────────────────
    if (req.method === "DELETE") {
      if (!id) return res.status(400).json({ error: "id obrigatório para delete." });
      await pool.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
      return res.status(200).json({ deleted: true });
    }

    return res.status(405).json({ error: "Método não permitido." });
  } catch (err) {
    console.error("[DB]", err.message);
    return res.status(500).json({ error: err.message });
  } finally {
    await pool.end();
  }
}
