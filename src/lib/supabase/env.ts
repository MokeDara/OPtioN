/** Supabase settings from .env.local (or Vercel's environment variables). */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

/** False until both variables are set — the app keeps running on the local demo data. */
export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);

export function requireSupabaseEnv() {
  if (!supabaseConfigured) {
    throw new Error("Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local.");
  }
  return { url: SUPABASE_URL, key: SUPABASE_KEY };
}
