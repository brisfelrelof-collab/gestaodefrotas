export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function uploadProfilePhoto(uid: string, role: string, file: File): Promise<{ ok: boolean; url?: string; error?: string }> {
  try {
    const dataUrl = await fileToBase64(file);
    // For local shim we just return the data URL; persistence is handled by callers
    return { ok: true, url: dataUrl };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? String(err) };
  }
}
