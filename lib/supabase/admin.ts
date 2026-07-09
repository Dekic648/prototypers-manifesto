import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * The service-role client. It BYPASSES every RLS policy — it is the only
 * credential that can read pending suggestions belonging to other people, and
 * the only one that can approve them.
 *
 * `import "server-only"` makes the build fail if this file is ever pulled into
 * a client component, rather than shipping the key to browsers.
 *
 * Never call this without first checking the caller is an admin. See
 * requireAdmin() in app/admin/actions.ts.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;

  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * GitHub logins allowed to moderate. Comma-separated.
 * Falls back to the repository owner so a fresh deploy isn't locked out.
 */
export function adminLogins(): string[] {
  const raw = process.env.ADMIN_GITHUB_LOGINS ?? "Dekic648";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}
