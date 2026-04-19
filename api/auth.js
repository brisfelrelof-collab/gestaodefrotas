// api/auth.js  —  Autenticação simples com Neon PostgreSQL
// POST /api/auth?action=login    → { email, password }
// POST /api/auth?action=register → { email, password, nome, role, ...extra }
// POST /api/auth?action=reset    → { email }

import { Pool } from "@neondatabase/serverless";
import crypto from "crypto";

function getPool() {
  return new Pool({ connectionString: process.env.DATABASE_URL });
}

// Hash simples com SHA-256 + salt fixo (para produção usa bcrypt)
function hashPassword(password) {
  const salt = process.env.AUTH_SALT ?? "frota_angola_2025";
  return crypto.createHmac("sha256", salt).update(password).digest("hex");
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const { action } = req.query;
  const pool = getPool();

  try {
    // ── LOGIN ─────────────────────────────────────────────────────────────
    if (action === "login") {
      const { email, password } = req.body;
      if (!email || !password)
        return res.status(400).json({ ok: false, error: "Email e senha obrigatórios." });

      // Contas locais rápidas (desenvolvimento)
      const quickUsers = [
        { id: "local-superadmin",   email: "admin@gmail.com",        nome: "Super Admin",   role: "superadmin",  pass: "admin123" },
        { id: "local-proprietario", email: "proprietario@gmail.com", nome: "Proprietário",  role: "proprietario",pass: "proprietario123" },
        { id: "local-usuario",      email: "usuario@gmail.com",      nome: "Usuário",       role: "usuario",     pass: "usuario123" },
      ];
      const quick = quickUsers.find(u => (u.email === email || email === u.nome) && password === u.pass);
      if (quick) {
        return res.status(200).json({ ok: true, user: { ...quick, status: "ativo" } });
      }

      const { rows } = await pool.query(
        `SELECT * FROM users WHERE email = $1 LIMIT 1`, [email]
      );
      if (rows.length === 0)
        return res.status(401).json({ ok: false, error: "Email ou senha incorrectos." });

      const user = rows[0];
      if (user.password_hash && user.password_hash !== hashPassword(password))
        return res.status(401).json({ ok: false, error: "Email ou senha incorrectos." });

      const { password_hash, ...safeUser } = user;
      return res.status(200).json({ ok: true, user: safeUser });
    }

    // ── REGISTER ──────────────────────────────────────────────────────────
    if (action === "register") {
      const { email, password, nome, role = "usuario", ...extra } = req.body;
      if (!email || !password || !nome)
        return res.status(400).json({ ok: false, error: "email, password e nome obrigatórios." });

      const uid  = crypto.randomUUID();
      const hash = hashPassword(password);

      const { rows } = await pool.query(
        `INSERT INTO users (id, email, nome, role, status, password_hash, telefone, foto_url)
         VALUES ($1,$2,$3,$4,'ativo',$5,$6,$7) RETURNING *`,
        [uid, email, nome, role, hash, extra.contacto ?? null, extra.foto_url ?? null]
      );
      const { password_hash, ...safeUser } = rows[0];
      return res.status(201).json({ ok: true, uid, user: safeUser });
    }

    // ── RESET PASSWORD ────────────────────────────────────────────────────
    if (action === "reset") {
      // Sem servidor de email configurado: apenas confirma recepção
      return res.status(200).json({ ok: true, message: "Reset solicitado (configure SMTP para envio real)." });
    }

    return res.status(400).json({ error: "action inválida." });
  } catch (err) {
    console.error("[Auth]", err.message);
    return res.status(500).json({ ok: false, error: err.message });
  } finally {
    await pool.end();
  }
}
