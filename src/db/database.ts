// src/db/database.ts
// ─── CRUD helpers — chama /api/db (Neon PostgreSQL) ─────────────────────────
// Drop-in replacement do src/supabase/database.ts
// Mantém a mesma API pública para não quebrar as páginas existentes.

import type {
  AppUser, Proprietario, Motorista, Viatura,
  Servico, Transacao, UsuarioCliente, Rota,
} from "../types";

const API = "/api/db";

// ─── Helpers genéricos ───────────────────────────────────────────────────────
async function fetchJSON<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error ?? `HTTP ${res.status}: ${url}`);
  }
  return res.json();
}

async function selectAll<T>(table: string, filterCol?: string, filterVal?: string): Promise<(T & { id: string })[]> {
  let url = `${API}?table=${table}`;
  if (filterCol && filterVal) url += `&filter_col=${filterCol}&filter_val=${encodeURIComponent(filterVal)}`;
  try {
    return await fetchJSON<(T & { id: string })[]>(url);
  } catch (e) {
    console.error(`selectAll ${table}:`, e);
    return [];
  }
}

async function selectOne<T>(table: string, id: string): Promise<(T & { id: string }) | null> {
  try {
    return await fetchJSON<T & { id: string }>(`${API}?table=${table}&id=${encodeURIComponent(id)}`);
  } catch {
    return null;
  }
}

async function insertRow<T>(table: string, data: Omit<T, "id">): Promise<(T & { id: string }) | null> {
  try {
    return await fetchJSON<T & { id: string }>(API + `?table=${table}`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(data),
    });
  } catch (e) {
    console.error(`insert ${table}:`, e);
    return null;
  }
}

async function upsertRow<T>(table: string, id: string, data: Omit<T, "id">): Promise<void> {
  try {
    await fetchJSON(API + `?table=${table}`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id, ...data }),
    });
  } catch (e) {
    console.error(`upsert ${table}:`, e);
  }
}

async function updateRow<T>(table: string, id: string, data: Partial<Omit<T, "id">>): Promise<void> {
  try {
    await fetchJSON(API + `?table=${table}&id=${encodeURIComponent(id)}`, {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(data),
    });
  } catch (e) {
    console.error(`update ${table}:`, e);
  }
}

async function deleteRow(table: string, id: string): Promise<void> {
  try {
    await fetch(`${API}?table=${table}&id=${encodeURIComponent(id)}`, { method: "DELETE" });
  } catch (e) {
    console.error(`delete ${table}:`, e);
  }
}

// ─── users ───────────────────────────────────────────────────────────────────
export const usersDB = {
  getAll:    () => selectAll<AppUser>("users"),
  getById:   (id: string) => selectOne<AppUser>("users", id),
  upsert:    (id: string, data: Omit<AppUser, "id">) => upsertRow<AppUser>("users", id, data),
  update:    (id: string, data: Partial<AppUser>) => updateRow<AppUser>("users", id, data),
  remove:    (id: string) => deleteRow("users", id),
  getByRole: (role: string) => selectAll<AppUser>("users", "role", role),
};

// ─── proprietarios ───────────────────────────────────────────────────────────
export const proprietariosDB = {
  getAll:  () => selectAll<Proprietario>("proprietarios"),
  getById: (id: string) => selectOne<Proprietario>("proprietarios", id),
  insert:  (data: Omit<Proprietario, "id">) => insertRow<Proprietario>("proprietarios", data),
  upsert:  (id: string, data: Omit<Proprietario, "id">) => upsertRow<Proprietario>("proprietarios", id, data),
  update:  (id: string, data: Partial<Proprietario>) => updateRow<Proprietario>("proprietarios", id, data),
  remove:  (id: string) => deleteRow("proprietarios", id),
};

// ─── motoristas ──────────────────────────────────────────────────────────────
export const motoristasDB = {
  getAll:  () => selectAll<Motorista>("motoristas"),
  getById: (id: string) => selectOne<Motorista>("motoristas", id),
  insert:  (data: Omit<Motorista, "id">) => insertRow<Motorista>("motoristas", data),
  update:  (id: string, data: Partial<Motorista>) => updateRow<Motorista>("motoristas", id, data),
  remove:  (id: string) => deleteRow("motoristas", id),
};

// ─── viaturas ────────────────────────────────────────────────────────────────
export const viaturasDB = {
  getAll:   () => selectAll<Viatura>("viaturas"),
  getById:  (id: string) => selectOne<Viatura>("viaturas", id),
  getByProprietario: (proprietario_id: string) =>
    selectAll<Viatura>("viaturas", "proprietario_id", proprietario_id),
  insert:   (data: Omit<Viatura, "id">) => insertRow<Viatura>("viaturas", data),
  update:   (id: string, data: Partial<Viatura>) => updateRow<Viatura>("viaturas", id, data),
  remove:   (id: string) => deleteRow("viaturas", id),

  // Realtime via polling (sem Supabase Realtime)
  listenAll: (callback: (items: (Viatura & { id: string })[]) => void) => {
    selectAll<Viatura>("viaturas").then(callback);
    const timer = setInterval(() => selectAll<Viatura>("viaturas").then(callback), 5000);
    return () => clearInterval(timer);
  },
  listenByProprietario: (proprietario_id: string, callback: (items: (Viatura & { id: string })[]) => void) => {
    selectAll<Viatura>("viaturas", "proprietario_id", proprietario_id).then(callback);
    const timer = setInterval(
      () => selectAll<Viatura>("viaturas", "proprietario_id", proprietario_id).then(callback),
      5000
    );
    return () => clearInterval(timer);
  },
};

// ─── servicos ────────────────────────────────────────────────────────────────
export const servicosDB = {
  getAll:            () => selectAll<Servico>("servicos"),
  getById:           (id: string) => selectOne<Servico>("servicos", id),
  getAtivos:         () => selectAll<Servico>("servicos", "status", "em_andamento"),
  getFinalizados:    () => selectAll<Servico>("servicos", "status", "finalizado"),
  getByViatura:      (viatura_id: string) => selectAll<Servico>("servicos", "viatura_id", viatura_id),
  getByUsuario:      (usuario_id: string) => selectAll<Servico>("servicos", "usuario_id", usuario_id),
  getByProprietario: (proprietario_id: string) => selectAll<Servico>("servicos", "proprietario_id", proprietario_id),
  insert:            (data: Omit<Servico, "id">) => insertRow<Servico>("servicos", data),
  update:            (id: string, data: Partial<Servico>) => updateRow<Servico>("servicos", id, data),
  remove:            (id: string) => deleteRow("servicos", id),
};

// ─── transacoes ──────────────────────────────────────────────────────────────
export const transacoesDB = {
  getAll:            () => selectAll<Transacao>("transacoes"),
  getByProprietario: (proprietario_id: string) =>
    selectAll<Transacao>("transacoes", "proprietario_id", proprietario_id),
  getByViatura:      (viatura_id: string) =>
    selectAll<Transacao>("transacoes", "viatura_id", viatura_id),
  insert:            (data: Omit<Transacao, "id">) => insertRow<Transacao>("transacoes", data),
  update:            (id: string, data: Partial<Transacao>) => updateRow<Transacao>("transacoes", id, data),
};

// ─── usuarios_clientes ───────────────────────────────────────────────────────
export const usuariosClientesDB = {
  getAll:  () => selectAll<UsuarioCliente>("usuarios_clientes"),
  getById: (id: string) => selectOne<UsuarioCliente>("usuarios_clientes", id),
  upsert:  (id: string, data: Omit<UsuarioCliente, "id">) =>
    upsertRow<UsuarioCliente>("usuarios_clientes", id, data),
  update:  (id: string, data: Partial<UsuarioCliente>) =>
    updateRow<UsuarioCliente>("usuarios_clientes", id, data),
  remove:  (id: string) => deleteRow("usuarios_clientes", id),
};

// ─── rotas ───────────────────────────────────────────────────────────────────
export const rotasDB = {
  getAll:  () => selectAll<Rota>("rotas"),
  getById: (id: string) => selectOne<Rota>("rotas", id),
  insert:  (data: Omit<Rota, "id">) => insertRow<Rota>("rotas", data),
  update:  (id: string, data: Partial<Rota>) => updateRow<Rota>("rotas", id, data),
  remove:  (id: string) => deleteRow("rotas", id),
};
