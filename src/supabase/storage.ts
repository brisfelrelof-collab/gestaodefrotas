// src/supabase/storage.ts
// ─── Supabase Storage — fotos de perfil ───────────────────────────────────────
// Bucket: "fotos" (criar no Supabase Console → Storage → New bucket → "fotos", público)

import { supabase } from "./client";

const BUCKET = "fotos";

// ─── Upload ───────────────────────────────────────────────────────────────────
export async function uploadProfilePhoto(
  uid:  string,
  role: "proprietarios" | "motoristas",
  file: File
): Promise<{ ok: boolean; url?: string; error?: string }> {
  try {
    const ext  = file.name.split(".").pop() ?? "jpg";
    const path = `${role}/${uid}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type });

    if (upErr) return { ok: false, error: upErr.message };

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return { ok: true, url: data.publicUrl };
  } catch (err: any) {
    return { ok: false, error: err.message ?? "Erro ao carregar imagem." };
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────
export async function deleteProfilePhoto(uid: string, role: "proprietarios" | "motoristas"): Promise<void> {
  for (const ext of ["jpg", "jpeg", "png", "webp"]) {
    await supabase.storage.from(BUCKET).remove([`${role}/${uid}.${ext}`]);
  }
}

// ─── Preview local (sem upload) ───────────────────────────────────────────────
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload  = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
