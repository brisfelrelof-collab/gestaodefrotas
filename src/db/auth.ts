// src/db/auth.ts
// ─── Autenticação via /api/auth (Neon PostgreSQL) ────────────────────────────
// Drop-in replacement de src/supabase/auth.ts

import type { AppUser, UserRole } from "../types";

// ─── Login ─────────────────────────────────────────────────────────────────
export async function supabaseLogin(
  email: string,
  password: string
): Promise<{ ok: boolean; user?: AppUser; error?: string }> {
  try {
    const res = await fetch("/api/auth?action=login", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!data.ok) return { ok: false, error: data.error ?? "Erro de autenticação." };

    // Persiste sessão no localStorage
    try {
      localStorage.setItem("local_auth_user", JSON.stringify(data.user));
      window.dispatchEvent(new CustomEvent("localAuthChange"));
    } catch {}

    return { ok: true, user: data.user as AppUser };
  } catch (e: any) {
    return { ok: false, error: "Erro de rede: " + e.message };
  }
}

// ─── Logout ────────────────────────────────────────────────────────────────
export async function supabaseLogout(): Promise<void> {
  try {
    localStorage.removeItem("local_auth_user");
    window.dispatchEvent(new CustomEvent("localAuthChange"));
  } catch {}
}

// ─── Registo ──────────────────────────────────────────────────────────────
export async function supabaseRegister(params: {
  email:    string;
  password: string;
  nome:     string;
  role:     UserRole;
  extra?:   Record<string, any>;
}): Promise<{ ok: boolean; uid?: string; error?: string }> {
  try {
    const res = await fetch("/api/auth?action=register", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ ...params, ...params.extra }),
    });
    const data = await res.json();
    return data;
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

// ─── Obter perfil completo ────────────────────────────────────────────────
export async function getUserProfile(uid: string): Promise<AppUser | null> {
  try {
    const res = await fetch(`/api/db?table=users&id=${encodeURIComponent(uid)}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ─── Sessão actual ────────────────────────────────────────────────────────
export function getCurrentUserId(): string | null {
  try {
    const raw = localStorage.getItem("local_auth_user");
    if (!raw) return null;
    return JSON.parse(raw)?.id ?? null;
  } catch {
    return null;
  }
}

// ─── Listener de sessão ──────────────────────────────────────────────────
export function onAuthStateChange(callback: (uid: string | null) => void) {
  const handler = () => {
    const raw = localStorage.getItem("local_auth_user");
    const uid = raw ? (JSON.parse(raw)?.id ?? null) : null;
    callback(uid);
  };
  window.addEventListener("localAuthChange", handler);
  return () => window.removeEventListener("localAuthChange", handler);
}

// ─── Reset de senha ───────────────────────────────────────────────────────
export async function resetPassword(email: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("/api/auth?action=reset", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email }),
    });
    return res.json();
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

// Alias para compatibilidade com ProprietariosPage que importa de supabase/auth
export { supabaseRegister as supabaseRegisterUser };

// ─── Funções legado (authLocal.ts) ───────────────────────────────────────
export function getCurrentUid(): string {
  try {
    const raw = localStorage.getItem("local_auth_user");
    return raw ? (JSON.parse(raw)?.id ?? "") : "";
  } catch { return ""; }
}

export function setCurrentUid(uid: string | null) {
  // Mantido por compatibilidade — a sessão é gerida pelo localStorage
}
