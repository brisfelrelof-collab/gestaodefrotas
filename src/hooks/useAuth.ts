// hooks/useAuth.ts
import { useState, useEffect } from "react";
import { authCurrentUser } from "../store";
import type { AppUser } from "../types";

export function useAuth() {
  const [user, setUser]       = useState<AppUser | null>(authCurrentUser);
  const [loading, setLoading] = useState(false);

  // Re-read whenever localStorage changes (e.g., login/logout in another tab)
  useEffect(() => {
    const handler = () => setUser(authCurrentUser());
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  return { user, loading, isAuthenticated: !!user };
}
