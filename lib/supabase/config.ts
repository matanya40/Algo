/**
 * True when env looks like real Supabase keys (not template placeholders).
 * Prevents uncaught fetch/parse errors that surface as Internal Server Error.
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  if (!url || !key) return false;
  if (url.includes("YOUR_") || key.includes("YOUR_")) return false;
  try {
    const u = new URL(url);
    if (!u.protocol.startsWith("http")) return false;
  } catch {
    return false;
  }
  // Legacy anon JWT, or newer publishable key (see Supabase dashboard → API)
  const looksLikeJwt = key.startsWith("eyJ") && key.length >= 80;
  const looksLikePublishable =
    key.startsWith("sb_publishable_") && key.length >= 24;
  if (!looksLikeJwt && !looksLikePublishable) return false;
  return true;
}
