import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

// Never serve a cached answer. A cache hit would return 200 without the
// database round-trip that is the entire point of this endpoint.
export const dynamic = "force-dynamic";

/**
 * Constant-time comparison. A plain `===` on a secret leaks its prefix through
 * timing, and this endpoint is reachable from the internet.
 */
function secretMatches(provided: string, expected: string) {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Touches the database so Supabase counts the project as active.
 *
 * Supabase pauses a free-tier project after 7 consecutive days without
 * activity. When it pauses, the API hostname stops resolving entirely — sign-in,
 * suggestions and voting all fail at once while the static manifesto keeps
 * rendering, because the ten principles are in the bundle rather than the
 * database. That is exactly what happened on 2026-07-19.
 *
 * A daily read resets the clock. The query is deliberately the cheapest thing
 * that still reaches Postgres: a HEAD count against `suggestions`, no rows
 * returned. It runs as anon, so RLS still applies — this route is a heartbeat,
 * not a back door.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  // Vercel attaches `Authorization: Bearer $CRON_SECRET` only when CRON_SECRET
  // is set on the project. Without it there is nothing to authenticate against,
  // so refuse rather than leave an open endpoint — and say so loudly, because a
  // keepalive that silently declines to run lets the project pause anyway.
  if (!secret) {
    console.error("keepalive: CRON_SECRET is not set — the heartbeat is NOT running");
    return NextResponse.json({ error: "keepalive not configured" }, { status: 501 });
  }

  const provided = request.headers.get("authorization") ?? "";
  if (!secretMatches(provided, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    console.error("keepalive: Supabase is not configured — the heartbeat is NOT running");
    return NextResponse.json({ error: "supabase not configured" }, { status: 501 });
  }

  const supabase = createSupabaseClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await supabase
    .from("suggestions")
    .select("id", { head: true, count: "exact" });

  // A failure here means the heartbeat did not land. Return 500 so it shows up
  // as a failed cron invocation in Vercel rather than a quiet success.
  if (error) {
    console.error("keepalive: the database did not answer", error.message);
    return NextResponse.json({ error: "database unreachable" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
