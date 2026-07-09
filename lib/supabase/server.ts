import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client, scoped to the request's cookies.
 *
 * Uses the anon key, so RLS still applies — this is NOT a way to read pending
 * suggestions. Approval happens only through the service role, which lives in
 * the Supabase dashboard and never in this codebase.
 *
 * Returns null when Supabase is unconfigured. See lib/supabase/client.ts.
 */
export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // Harmless: middleware refreshes the session on every request.
        }
      },
    },
  });
}
