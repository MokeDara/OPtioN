import "server-only";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseEnv } from "./env";

/**
 * Supabase client with the secret key: bypasses row-level security and can create logins.
 * Server only — never import this from a client component, and never prefix the key with NEXT_PUBLIC_.
 */
export function createAdminClient() {
  const { url } = requireSupabaseEnv();
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) throw new Error("SUPABASE_SECRET_KEY is not set. Add it to .env.local (Supabase → Project Settings → API Keys → Secret key).");
  return createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
}
