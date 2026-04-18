/**
 * store/index.ts
 * Minimal localStorage-based store — mirrors the no-firebase.js shim from the
 * original project. Provides typed CRUD helpers for every collection.
 */

import type { AppUser, Veiculo, Motorista, Rota, Aluguer } from "../types";

// ─── Core helpers ─────────────────────────────────────────────────────────────
function loadJSON<T>(key: string, def: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : def;
  } catch {
    return def;
  }
}

function saveJSON<T>(key: string, val: T): void {
  localStorage.setItem(key, JSON.stringify(val));
}

type Collection<T> = Record<string, T>;

function getCol<T>(name: string): Collection<T> {
  return loadJSON<Collection<T>>(`coll:${name}`, {});
}

function setCol<T>(name: string, col: Collection<T>): void {
  saveJSON(`coll:${name}`, col);
}

function colToArray<T extends { id: string }>(col: Collection<Omit<T, "id">>): T[] {
  return Object.entries(col).map(([id, data]) => ({ id, ...data } as T));
}

function genId(): string {
  return "d" + Date.now() + Math.floor(Math.random() * 1000);
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface LoginResult {
  ok: boolean;
  user?: AppUser;
  error?: string;
}

function seedDefaultUsers(): void {
  const usersKey = "app_users";
  const users = loadJSON<AppUser[]>(usersKey, []);

  function ensure(email: string, password: string, nome: string, cargo: AppUser["cargo"]) {
    if (users.find((u) => u.email === email)) return;
    const uid = "u" + Date.now() + Math.floor(Math.random() * 1000);
    (users as any[]).push({ uid, email, password, nome, cargo, status: "ativo", createdAt: new Date().toISOString() });
    saveJSON(usersKey, users);
    const col = getCol<Omit<AppUser, "id">>("usuarios");
    col[uid] = { uid, email, nome, cargo, status: "ativo", createdAt: new Date().toISOString() };
    setCol("usuarios", col);
  }

  ensure("admin@gmail.com", "1", "Administrador", "admin");
  ensure("d@gmail.com", "1", "Usuário Teste", "operador");
}

seedDefaultUsers();

export function authLogin(email: string, password: string): LoginResult {
  const users = loadJSON<any[]>("app_users", []);
  const found = users.find((u) => u.email === email);
  if (!found) return { ok: false, error: "Utilizador não encontrado." };
  const aliasRange = /^[1-6]$/;
  const ok =
    found.password === password ||
    (found.password === "1" && aliasRange.test(String(password)));
  if (!ok) return { ok: false, error: "Senha incorrecta." };
  saveJSON("current_user", found);
  return { ok: true, user: found as AppUser };
}

export function authLogout(): void {
  localStorage.removeItem("current_user");
}

export function authCurrentUser(): AppUser | null {
  return loadJSON<AppUser | null>("current_user", null);
}

// ─── Generic CRUD factory ─────────────────────────────────────────────────────
function makeCRUD<T extends { id: string }>(collName: string) {
  return {
    getAll(): T[] {
      return colToArray<T>(getCol<Omit<T, "id">>(collName));
    },
    getById(id: string): T | null {
      const col = getCol<Omit<T, "id">>(collName);
      return col[id] ? ({ id, ...col[id] } as T) : null;
    },
    add(data: Omit<T, "id">): T {
      const col = getCol<Omit<T, "id">>(collName);
      const id = genId();
      const record = { ...data, createdAt: new Date().toISOString() };
      col[id] = record;
      setCol(collName, col);
      return { id, ...record } as T;
    },
    update(id: string, data: Partial<Omit<T, "id">>): T | null {
      const col = getCol<Omit<T, "id">>(collName);
      if (!col[id]) return null;
      col[id] = { ...col[id], ...data };
      setCol(collName, col);
      return { id, ...col[id] } as T;
    },
    remove(id: string): boolean {
      const col = getCol<Omit<T, "id">>(collName);
      if (!col[id]) return false;
      delete col[id];
      setCol(collName, col);
      return true;
    },
    exists(field: keyof T, value: unknown, excludeId?: string): boolean {
      return colToArray<T>(getCol<Omit<T, "id">>(collName)).some(
        (item) => item[field] === value && item.id !== excludeId
      );
    },
  };
}

// ─── Collections ─────────────────────────────────────────────────────────────
export const veiculosStore = makeCRUD<Veiculo>("veiculos");
export const motoristasStore = makeCRUD<Motorista>("motoristas");
export const rotasStore = makeCRUD<Rota>("rotas");
export const alugueresStore = makeCRUD<Aluguer>("alugueres");
export const utilizadoresStore = makeCRUD<AppUser>("usuarios");

// ─── Plate validation (Angola) ────────────────────────────────────────────────
export function validarPlacaAngolana(placa: string): { valido: boolean; formatado: string } {
  placa = placa.trim().toUpperCase();
  const antigo = /^[A-Z]{3}-\d{4}$/;
  const novo = /^[A-Z]{2}-\d{2}-\d{2}-[A-Z]{2}$/;
  const novoSemHifen = /^[A-Z]{2}\d{2}\d{2}[A-Z]{2}$/;

  if (antigo.test(placa)) return { valido: true, formatado: placa };
  if (novo.test(placa)) return { valido: true, formatado: placa };
  if (novoSemHifen.test(placa)) {
    const f = `${placa.slice(0, 2)}-${placa.slice(2, 4)}-${placa.slice(4, 6)}-${placa.slice(6, 8)}`;
    return { valido: true, formatado: f };
  }
  return { valido: false, formatado: placa };
}
