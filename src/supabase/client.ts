// src/supabase/client.ts
// ─── Cliente Supabase ──────────────────────────────────────────────────────────
// Substitui completamente o Firebase.
// Substitui YOUR_SUPABASE_URL e YOUR_SUPABASE_ANON_KEY pelas tuas credenciais:
//   Supabase Console → Settings → API → Project URL + anon/public key

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL  = "https://imzipgqsejgvptwqxdkx.supabase.co";   // ex: https://xyzcompany.supabase.co
const SUPABASE_ANON = "sb_publishable_gyxUSYqPhqiLc69uNnR5ag_9x74rmNS"; // chave pública (anon key)

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
