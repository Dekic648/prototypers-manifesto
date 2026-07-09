import crypto from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const REPO = process.env.GITHUB_REPO ?? "Dekic648/prototypers-manifesto";

/**
 * Constant-time comparison. A plain `===` on a secret leaks its prefix through
 * timing, and this endpoint is public.
 */
function secretMatches(provided: string, expected: string) {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function dashboardUrl(suggestionId: string) {
  const ref = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(
    /https:\/\/([^.]+)\.supabase\.co/,
  )?.[1];
  if (!ref) return null;
  return `https://supabase.com/dashboard/project/${ref}/editor?schema=public&table=suggestions&filter=id:eq:${suggestionId}`;
}

/**
 * Called by a Supabase Database Webhook on INSERT into `suggestions`.
 * Opens a GitHub issue so the maintainer is told a suggestion arrived.
 *
 * THE ISSUE NEVER CONTAINS THE SUGGESTED TEXT.
 *
 * This repo is public, so its issues are public. Echoing `proposed_text` here
 * would publish unmoderated writing the instant it was submitted — exactly what
 * approve-first exists to prevent, and it would put anything abusive in the
 * issue tracker under the maintainer's name. The issue carries metadata and a
 * link; reading the suggestion means opening Supabase, where RLS still applies.
 */
export async function POST(request: Request) {
  const secret = process.env.SUGGESTION_WEBHOOK_SECRET;
  const token = process.env.GITHUB_TOKEN;

  // Never let an unconfigured deployment become an open relay to the GitHub API.
  if (!secret || !token) {
    return NextResponse.json({ error: "notifications not configured" }, { status: 501 });
  }

  const provided = request.headers.get("x-manifesto-webhook-secret") ?? "";
  if (!secretMatches(provided, secret)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "bad payload" }, { status: 400 });
  }

  const body = payload as {
    type?: string;
    table?: string;
    record?: Record<string, unknown>;
  };

  if (body.type !== "INSERT" || body.table !== "suggestions" || !body.record) {
    return NextResponse.json({ ignored: true });
  }

  const r = body.record;
  const id = String(r.id ?? "");
  const kind = r.kind === "new_principle" ? "new principle" : "edit";
  const principle = typeof r.principle_id === "string" ? r.principle_id : null;
  const author =
    typeof r.author_github_login === "string" && r.author_github_login
      ? `@${r.author_github_login}`
      : "a reader who signed in with email";

  const link = dashboardUrl(id);

  const title = principle
    ? `[suggestion] edit to "${principle}"`
    : "[suggestion] a new principle";

  // Metadata only. No proposed_text. No rationale.
  const issueBody = [
    `A suggestion is **awaiting review**.`,
    ``,
    `| | |`,
    `|---|---|`,
    `| Kind | ${kind} |`,
    `| Principle | ${principle ?? "—"} |`,
    `| From | ${author} |`,
    `| Row | \`${id}\` |`,
    ``,
    link ? `**[Read it and approve or reject →](${link})**` : `Row id: \`${id}\``,
    ``,
    `---`,
    ``,
    `The suggested wording is deliberately not reproduced here. This repository is`,
    `public, and suggestions are moderated before they appear on the manifesto.`,
  ].join("\n");

  const res = await fetch(`https://api.github.com/repos/${REPO}/issues`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title, body: issueBody }),
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error("GitHub issue creation failed", res.status, detail);
    return NextResponse.json({ error: "github rejected the issue" }, { status: 502 });
  }

  const issue = (await res.json()) as { number?: number };
  return NextResponse.json({ ok: true, issue: issue.number });
}
