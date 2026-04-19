import { createClient } from "@supabase/supabase-js";

// NOTE: these values mirror src/supabase/client.ts — adjust if you changed them
const SUPABASE_URL  = "https://imzipgqsejgvptwqxdkx.supabase.co";
const SUPABASE_ANON = "sb_publishable_gyxUSYqPhqiLc69uNnR5ag_9x74rmNS";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

const ADMIN_EMAIL = "admin@gmail.com";
const ADMIN_PASS  = "admin123";

async function main() {
  try {
    // check if user already exists in users table
    const { data: existing, error: existErr } = await supabase
      .from("users")
      .select("id")
      .eq("email", ADMIN_EMAIL)
      .single();

    if (existErr && existErr.code !== "PGRST116") {
      // PGRST116 is returned when no rows found for .single()
      console.error("Erro ao verificar utilizador existente:", existErr.message || existErr);
      process.exit(1);
    }
    if (existing) {
      console.log("Já existe um utilizador com esse email:", ADMIN_EMAIL, "-> id=", existing.id);
      process.exit(0);
    }

    // Create auth user (sign up)
    const { data, error } = await supabase.auth.signUp({ email: ADMIN_EMAIL, password: ADMIN_PASS });
    if (error) {
      console.error("Erro ao criar conta Auth:", error.message || error);
      process.exit(1);
    }
    const uid = data.user?.id;
    if (!uid) {
      console.error("Não foi possível obter uid do utilizador criado.");
      process.exit(1);
    }

    // Insert profile in users table
    const { error: insErr } = await supabase.from("users").insert({
      id: uid,
      email: ADMIN_EMAIL,
      nome: "Super Admin (teste)",
      role: "superadmin",
      status: "ativo",
    });
    if (insErr) {
      console.error("Erro ao inserir perfil na tabela users:", insErr.message || insErr);
      process.exit(1);
    }

    console.log("Super admin criado com sucesso:", ADMIN_EMAIL, "| senha:", ADMIN_PASS);
    console.log("UID:", uid);
  } catch (e) {
    console.error("Erro inesperado:", e);
    process.exit(1);
  }
}

main();
