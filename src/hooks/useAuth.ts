// src/hooks/useAuth.ts
// ─── Hook reactivo de autenticação — Supabase ─────────────────────────────────

import { useState, useEffect } from "react";
import { getUserProfile, onAuthStateChange, getCurrentUid } from "../db/auth";
import type { AppUser, UserRole } from "../types";

export interface AuthState {
  user:            AppUser | null;
  loading:         boolean;
  isAuthenticated: boolean;
  role:            UserRole | null;
  isSuperAdmin:    boolean;
  isProprietario:  boolean;
  isMotorista:     boolean;
  isUsuario:       boolean;
}

export function useAuth(): AuthState {
  const [user,    setUser]    = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Lê a sessão actual local (Neon / API-backed session em localStorage)
    (async () => {
      const uid = getCurrentUid();
      if (uid) {
        const profile = await getUserProfile(uid);
        setUser(profile);
      }
      setLoading(false);
    })();

    // 2. Subscreve mudanças de sessão via listener em src/db/auth
    const unsub = onAuthStateChange(async (uid: string | null) => {
      if (uid) {
        const profile = await getUserProfile(uid);
        setUser(profile);
      } else {
        try { localStorage.removeItem("local_auth_user"); } catch {}
        setUser(null);
      }
      setLoading(false);
    });

    return () => { unsub(); };
  }, []);

  const role = user?.role ?? null;

  return {
    user,
    loading,
    isAuthenticated: !!user,
    role,
    isSuperAdmin:    role === "superadmin",
    isProprietario:  role === "proprietario",
    isMotorista:     role === "motorista",
    isUsuario:       role === "usuario",
  };
}
