// src/supabase/database.ts
// ─── CRUD helpers para todas as tabelas Supabase ──────────────────────────────
// Cada função corresponde a uma tabela no schema `public` do Supabase.

import { supabase } from "./client";
import type {
  AppUser, Proprietario, Motorista, Viatura,
  Servico, Transacao, UsuarioCliente, Rota,
} from "../types";

// ─── Helper genérico ──────────────────────────────────────────────────────────
async function selectAll<T>(table: string, filters?: Record<string, any>): Promise<(T & { id: string })[]> {
  let q = supabase.from(table).select("*").order("created_at", { ascending: false });
  if (filters) {
    Object.entries(filters).forEach(([col, val]) => { q = q.eq(col, val); });
  }
  const { data, error } = await q;
  if (error) { console.error(`selectAll ${table}:`, error.message); return []; }
  return (data ?? []) as (T & { id: string })[];
}

async function selectOne<T>(table: string, id: string): Promise<(T & { id: string }) | null> {
  const { data, error } = await supabase.from(table).select("*").eq("id", id).single();
  if (error || !data) return null;
  return data as T & { id: string };
}

async function insertRow<T>(table: string, data: Omit<T, "id">): Promise<(T & { id: string }) | null> {
  // cast to any to satisfy Supabase client TypeScript overloads
  const { data: row, error } = await (supabase.from(table).insert(data as any) as any).select().single();
  if (error) { console.error(`insert ${table}:`, error.message); return null; }
  return row as T & { id: string };
}

async function upsertRow<T>(table: string, id: string, data: Omit<T, "id">): Promise<void> {
  const { error } = await (supabase.from(table).upsert({ id, ...(data as any) } as any) as any);
  if (error) console.error(`upsert ${table}:`, error.message);
}

async function updateRow<T>(table: string, id: string, data: Partial<Omit<T, "id">>): Promise<void> {
  const { error } = await (supabase.from(table).update(data as any) as any).eq("id", id);
  if (error) console.error(`update ${table}:`, error.message);
}

async function deleteRow(table: string, id: string): Promise<void> {
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) console.error(`delete ${table}:`, error.message);
}

// ─── users ───────────────────────────────────────────────────────────────────
export const usersDB = {
  getAll:    () => selectAll<AppUser>("users"),
  getById:   (id: string) => selectOne<AppUser>("users", id),
  upsert:    (id: string, data: Omit<AppUser, "id">) => upsertRow<AppUser>("users", id, data),
  update:    (id: string, data: Partial<AppUser>) => updateRow<AppUser>("users", id, data),
  remove:    (id: string) => deleteRow("users", id),
  getByRole: async (role: string) => selectAll<AppUser>("users", { role }),
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
  getByProprietario: (proprietario_id: string) => selectAll<Viatura>("viaturas", { proprietario_id }),
  insert:   (data: Omit<Viatura, "id">) => insertRow<Viatura>("viaturas", data),
  update:   (id: string, data: Partial<Viatura>) => updateRow<Viatura>("viaturas", id, data),
  remove:   (id: string) => deleteRow("viaturas", id),

  // Realtime listener (para MonitoramentoPage — substitui onSnapshot do Firebase)
  listenAll: (callback: (items: (Viatura & { id: string })[]) => void) => {
    // Carrega dados iniciais
    selectAll<Viatura>("viaturas").then(callback);
    // Subscreve a alterações em tempo real
    const channel = supabase
      .channel("viaturas-all")
      .on("postgres_changes", { event: "*", schema: "public", table: "viaturas" }, () => {
        selectAll<Viatura>("viaturas").then(callback);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  },

  listenByProprietario: (proprietario_id: string, callback: (items: (Viatura & { id: string })[]) => void) => {
    selectAll<Viatura>("viaturas", { proprietario_id }).then(callback);
    const channel = supabase
      .channel(`viaturas-prop-${proprietario_id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "viaturas",
        filter: `proprietario_id=eq.${proprietario_id}` }, () => {
        selectAll<Viatura>("viaturas", { proprietario_id }).then(callback);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  },
};

// ─── servicos ────────────────────────────────────────────────────────────────
export const servicosDB = {
  getAll:             () => selectAll<Servico>("servicos"),
  getById:            (id: string) => selectOne<Servico>("servicos", id),
  getAtivos:          () => selectAll<Servico>("servicos", { status: "em_andamento" }),
  getFinalizados:     () => selectAll<Servico>("servicos", { status: "finalizado" }),
  getByViatura:       (viatura_id: string) => selectAll<Servico>("servicos", { viatura_id }),
  getByUsuario:       (usuario_id: string) => selectAll<Servico>("servicos", { usuario_id }),
  getByProprietario:  (proprietario_id: string) => selectAll<Servico>("servicos", { proprietario_id }),
  insert:             (data: Omit<Servico, "id">) => insertRow<Servico>("servicos", data),
  update:             (id: string, data: Partial<Servico>) => updateRow<Servico>("servicos", id, data),
  remove:             (id: string) => deleteRow("servicos", id),
};

// ─── transacoes ──────────────────────────────────────────────────────────────
export const transacoesDB = {
  getAll:             () => selectAll<Transacao>("transacoes"),
  getByProprietario:  (proprietario_id: string) => selectAll<Transacao>("transacoes", { proprietario_id }),
  getByViatura:       (viatura_id: string) => selectAll<Transacao>("transacoes", { viatura_id }),
  insert:             (data: Omit<Transacao, "id">) => insertRow<Transacao>("transacoes", data),
  update:             (id: string, data: Partial<Transacao>) => updateRow<Transacao>("transacoes", id, data),
};

// ─── usuarios_clientes ───────────────────────────────────────────────────────
export const usuariosClientesDB = {
  getAll:  () => selectAll<UsuarioCliente>("usuarios_clientes"),
  getById: (id: string) => selectOne<UsuarioCliente>("usuarios_clientes", id),
  upsert:  (id: string, data: Omit<UsuarioCliente, "id">) => upsertRow<UsuarioCliente>("usuarios_clientes", id, data),
  update:  (id: string, data: Partial<UsuarioCliente>) => updateRow<UsuarioCliente>("usuarios_clientes", id, data),
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
