// src/supabase/auth.ts
// ─── Autenticação via Supabase Auth ───────────────────────────────────────────

import { supabase } from "./client";
import type { AppUser, UserRole } from "../types";

// ─── Login ─────────────────────────────────────────────────────────────────────
export async function supabaseLogin(
  email: string,
  password: string
): Promise<{ ok: boolean; user?: AppUser; error?: string }> {
  // Development/backdoor: quick local accounts for testing (do not use in production)
  const quickUsers: Array<{
    id: string;
    identifier: string; // name login or email local alias
    email: string;
    nome: string;
    role: UserRole | string;
    pass: string;
  }> = [
    { id: "local-superadmin",  identifier: "admin",        email: "admin@gmail.com",        nome: "Super Admin (local)",  role: "superadmin",  pass: "admin123" },
    { id: "local-proprietario", identifier: "proprietario", email: "proprietario@gmail.com", nome: "Proprietário (local)",  role: "proprietario", pass: "proprietario123" },
    { id: "local-usuario",     identifier: "usuario",      email: "usuario@gmail.com",      nome: "Usuário (local)",       role: "usuario",      pass: "usuario123" },
  ];

  // add user1..user5 with password usuario123
  for (let i = 1; i <= 5; i++) {
    quickUsers.push({ id: `local-user${i}`, identifier: `user${i}`, email: `user${i}@local.test`, nome: `User ${i} (local)`, role: "usuario", pass: "usuario123" });
  }
  // add proprietario1 and proprietario2 with password p123
  quickUsers.push({ id: "local-proprietario1", identifier: "proprietario1", email: "proprietario1@local.test", nome: "Proprietario 1 (local)", role: "proprietario", pass: "p123" });
  quickUsers.push({ id: "local-proprietario2", identifier: "proprietario2", email: "proprietario2@local.test", nome: "Proprietario 2 (local)", role: "proprietario", pass: "p123" });

  for (const u of quickUsers) {
    if ((email === u.identifier || email === u.email || email === u.nome) && password === u.pass) {
      const local: AppUser = { id: u.id, uid: u.id, email: u.email, nome: u.nome, role: u.role as UserRole, status: "ativo" };
      try { localStorage.setItem("local_auth_user", JSON.stringify(local)); try { window.dispatchEvent(new CustomEvent("localAuthChange")); } catch {} } catch {}
      return { ok: true, user: local };
    }
  }
  // If the provided identifier is not an email, try to resolve it as a `nome` in users table
  let loginEmail = email;
  if (!email.includes("@")) {
    try {
      // try exact match first
      let { data: users, error: qerr } = await supabase.from("users").select("email").eq("nome", email).limit(1);
      if (!qerr && users && users.length > 0) loginEmail = users[0].email;
      else {
        // try case-insensitive partial match
        const pattern = `%${email}%`;
        const { data: users2 } = await supabase.from("users").select("email").ilike("nome", pattern).limit(1);
        if (users2 && users2.length > 0) loginEmail = users2[0].email;
        else return { ok: false, error: "Nome de utilizador não encontrado." };
      }
    } catch (e) {
      return { ok: false, error: "Erro ao procurar utilizador." };
    }
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
  if (error || !data.user) return { ok: false, error: translateError(error?.message ?? "") };

  const profile = await getUserProfile(data.user.id);
  if (!profile) return { ok: false, error: "Perfil não encontrado. Contacte o administrador." };

  return { ok: true, user: profile };
}

// ─── Logout ────────────────────────────────────────────────────────────────────
export async function supabaseLogout(): Promise<void> {
  await supabase.auth.signOut();
  try { localStorage.removeItem("local_auth_user"); try { window.dispatchEvent(new CustomEvent("localAuthChange")); } catch {} } catch {}
}

// ─── Registo (SuperAdmin cria proprietários; cliente regista-se a si próprio) ──
export async function supabaseRegister(params: {
  email:    string;
  password: string;
  nome:     string;
  role:     UserRole;
  extra?:   Record<string, any>;
}): Promise<{ ok: boolean; uid?: string; error?: string }> {
  // 1. Cria a conta em Supabase Auth
  const { data, error } = await supabase.auth.signUp({
    email:    params.email,
    password: params.password,
  });
  if (error || !data.user) return { ok: false, error: translateError(error?.message ?? "") };

  const uid = data.user.id;

  // 2. Insere o perfil na tabela `users`
  const { error: insErr } = await supabase.from("users").insert({
    id:         uid,
    email:      params.email,
    nome:       params.nome,
    role:       params.role,
    status:     "ativo",
    ...params.extra,
  });
  if (insErr) return { ok: false, error: insErr.message };

  return { ok: true, uid };
}

// ─── Obter perfil completo da tabela `users` ──────────────────────────────────
export async function getUserProfile(uid: string): Promise<AppUser | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", uid)
    .single();
  if (error || !data) return null;
  return data as AppUser;
}

// ─── Sessão actual (síncrono — só devolve o ID) ───────────────────────────────
export function getCurrentUserId(): string | null {
  // Supabase guarda a sessão no localStorage automaticamente
  const session = supabase.auth.getSession();
  // Para uso síncrono usa o cache local — a sessão já está carregada
  return null; // Use useAuth() hook para valor reactivo
}

// ─── Listener de alteração de sessão ─────────────────────────────────────────
export function onAuthStateChange(callback: (uid: string | null) => void) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user?.id ?? null);
  });
  return data.subscription.unsubscribe;
}

// ─── Reset de senha ───────────────────────────────────────────────────────────
export async function resetPassword(email: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ─── Tradução de erros ────────────────────────────────────────────────────────
function translateError(msg: string): string {
  if (msg.includes("Invalid login credentials")) return "Email ou senha incorrectos.";
  if (msg.includes("Email not confirmed"))        return "Email ainda não confirmado. Verifique a sua caixa de correio.";
  if (msg.includes("User already registered"))    return "Este email já está registado.";
  if (msg.includes("Password should be"))         return "A senha deve ter mínimo 6 caracteres.";
  if (msg.includes("Unable to validate"))         return "Erro de validação. Tente novamente.";
  if (msg.includes("Network"))                    return "Erro de rede. Verifique a sua ligação.";
  return msg || "Erro de autenticação.";
}
