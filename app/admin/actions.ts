"use server";

import { revalidatePath } from "next/cache";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { adminLogins, createAdminClient } from "@/lib/supabase/admin";

/**
 * A Server Action is a public HTTP endpoint. Rendering the page behind an admin
 * check protects the page, not the actions — anyone who learns the action id can
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

async function setStatus(id: string, status: "approved" | "rejected") {
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
}

export async function approveSuggestion(id: string) {
  await setStatus(id, "approved");
}

export async function rejectSuggestion(id: string) {
  await setStatus(id, "rejected");
}
