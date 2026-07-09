import { createBrowserClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Whether Supabase is configured for this build.
 *
 * NEXT_PUBLIC_* values are inlined at build time, so a contributor who cloned
 * the repo without a .env.local gets `false` here. The manifesto is the point
 * of this site; it must render for them anyway. Every Supabase-backed feature
 * checks this and degrades to nothing rather than throwing.
 */
export const isSupabaseConfigured = Boolean(url && anonKey);

/**
 * The anon key is public by design — it ships inside the browser bundle.
 * Row Level Security is what constrains it, not secrecy.
 */
export function createClient() {
  if (!url || !anonKey) return null;
  return createBrowserClient(url, anonKey);
}
