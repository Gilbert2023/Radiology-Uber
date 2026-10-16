import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase is optional. With NEXT_PUBLIC_SUPABASE_URL and
 * NEXT_PUBLIC_SUPABASE_ANON_KEY set at build time, accounts, cloud progress and
 * the admin area are enabled. Without them the site runs in local demo mode.
 *
 * The anon key is designed to be public; data is protected by the row-level
 * security policies in supabase/schema.sql. Never put the service_role key here.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const accountsEnabled = Boolean(url && anonKey);

let client: SupabaseClient | null = null;
export function getSupabase(): SupabaseClient | null {
  if (!accountsEnabled || typeof window === "undefined") return null;
  client ??= createClient(url!, anonKey!, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  return client;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: "learner" | "admin";
  disabled: boolean;
  certificate_revoked: boolean;
  created_at: string;
  last_active_at: string | null;
}
