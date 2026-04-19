// src/hooks/useAuth.ts
// ─── Hook reactivo de autenticação — Supabase ─────────────────────────────────

import { useState, useEffect } from "react";
import { supabase } from "../supabase/client";
import { getUserProfile } from "../supabase/auth";
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
    // 1. Lê a sessão actual ao montar
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session?.user) {
        const profile = await getUserProfile(data.session.user.id);
        setUser(profile);
      } else {
        // Fallback: check for local backdoor test user
        try {
          const raw = localStorage.getItem("local_auth_user");
          if (raw) {
            setUser(JSON.parse(raw));
          }
        } catch {}
      }
      setLoading(false);
    });

    // 2. Subscreve a alterações de sessão (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const profile = await getUserProfile(session.user.id);
          setUser(profile);
        } else {
          // session ended — clear any local backdoor user
          try { localStorage.removeItem("local_auth_user"); } catch {}
          setUser(null);
        }
        setLoading(false);
      }
    );

    // 3. Listen for local backdoor login events
    const onLocal = () => {
      try {
        const raw = localStorage.getItem("local_auth_user");
        if (raw) setUser(JSON.parse(raw));
        else setUser(null);
      } catch { setUser(null); }
    };
    window.addEventListener("localAuthChange", onLocal);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("localAuthChange", onLocal);
    };
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
