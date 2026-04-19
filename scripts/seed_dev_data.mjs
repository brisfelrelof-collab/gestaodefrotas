import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

// NOTE: adjust these to match src/supabase/client.ts if needed
const SUPABASE_URL  = "https://imzipgqsejgvptwqxdkx.supabase.co";
const SUPABASE_ANON = "sb_publishable_gyxUSYqPhqiLc69uNnR5ag_9x74rmNS";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

const users = [
  // user1..user5 (role usuario)
  ...Array.from({ length: 5 }, (_, i) => ({
    email: `user${i + 1}@local.test`,
    nome: `user${i + 1}`,
    role: 'usuario'
  })),
  // proprietarios
  { email: 'proprietario1@local.test', nome: 'proprietario1', role: 'proprietario' },
  { email: 'proprietario2@local.test', nome: 'proprietario2', role: 'proprietario' },
];

async function main() {
  try {
    for (const u of users) {
      const check = await supabase.from('users').select('id').ilike('email', u.email).limit(1);
      if (check.error && check.error.code !== 'PGRST116') {
        console.error('Erro a verificar usuário', u.email, check.error.message || check.error);
        continue;
      }
      if (check.data && check.data.length > 0) {
        console.log('Já existe:', u.email);
        continue;
      }
      const id = randomUUID();
      const { error: insErr } = await supabase.from('users').insert({ id, email: u.email, nome: u.nome, role: u.role, status: 'ativo' });
      if (insErr) console.error('Erro ao inserir', u.email, insErr.message || insErr);
      else console.log('Inserido:', u.email, 'nome=', u.nome, 'role=', u.role);
    }
    console.log('Seed concluída. Nota: este script insere perfis na tabela `users` apenas.');
  } catch (e) {
    console.error('Erro inesperado:', e);
    process.exit(1);
  }
}

main();
