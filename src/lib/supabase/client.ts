"use client";
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseEnv } from "./env";

let client: SupabaseClient | undefined;

/** Supabase client for client components. One instance per browser tab; the session lives in cookies. */
export function createClient(): SupabaseClient {
  if (!client) {
    const { url, key } = requireSupabaseEnv();
    client = createBrowserClient(url, key);
  }
  return client;
}
