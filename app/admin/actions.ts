"use server";

import { revalidatePath } from "next/cache";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { adminLogins, createAdminClient } from "@/lib/supabase/admin";
import type { SuggestionStatus } from "@/lib/types";

/**
 * A Server Action is a public HTTP endpoint. Rendering the page behind an admin
 * check protects the page, not the actions — anyone who learns an action id can
 * POST to it directly. So every action re-verifies the caller from the session
 * cookie before touching the service-role client.
 */
export async function requireAdmin(): Promise<User | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return null;

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const login = meta.user_name ?? meta.preferred_username;
  if (typeof login !== "string") return null;

  return adminLogins().includes(login.toLowerCase()) ? user : null;
}

/**
 * Whether the current session may moderate, and how many suggestions are
 * waiting. Called from the client auth menu to decide whether to show a
 * "Moderate" link — the allowlist (ADMIN_GITHUB_LOGINS) never leaves the
 * server, so a non-admin learns nothing by inspecting the response.
 *
 * A non-admin always gets `{ isAdmin: false, pending: 0 }`, indistinguishable
 * from an admin with an empty queue would be — except an admin's isAdmin is true.
 */
export async function getModerationStatus(): Promise<{
  isAdmin: boolean;
  pending: number;
}> {
  const admin = await requireAdmin();
  if (!admin) return { isAdmin: false, pending: 0 };

  const db = createAdminClient();
  if (!db) return { isAdmin: true, pending: 0 };

  const { count } = await db
    .from("suggestions")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  return { isAdmin: true, pending: count ?? 0 };
}

async function setStatus(id: string, status: SuggestionStatus) {
  const admin = await requireAdmin();
  if (!admin) throw new Error("Not authorised.");

  const db = createAdminClient();
  if (!db) throw new Error("Server is not configured for moderation.");

  const { error } = await db
    .from("suggestions")
    .update({
      status,
      approved_at: status === "approved" ? new Date().toISOString() : null,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function approveSuggestion(id: string) {
  await setStatus(id, "approved");
}

export async function rejectSuggestion(id: string) {
  await setStatus(id, "rejected");
}

/**
 * Unapprove. The suggestion returns to the queue rather than vanishing — a
 * decision you regret is not the same as one you never made, and the author can
 * still see it as "awaiting review".
 *
 * Its votes survive. Approve it again and the count is where it was.
 */
export async function unapproveSuggestion(id: string) {
  await setStatus(id, "pending");
}

/**
 * Delete, permanently. Cascades to its votes.
 *
 * Reject hides a suggestion from everyone but its author. Delete is for the
 * things that should not exist at all — abuse, spam, a duplicate. There is no
 * DELETE policy on `suggestions` for any client role, so this can only ever run
 * here, behind the admin check, with the service role.
 */
export async function deleteSuggestion(id: string) {
  const admin = await requireAdmin();
  if (!admin) throw new Error("Not authorised.");

  const db = createAdminClient();
  if (!db) throw new Error("Server is not configured for moderation.");

  const { error } = await db.from("suggestions").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
  revalidatePath("/");
}
