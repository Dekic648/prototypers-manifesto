import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth redirect target.
 *
 * The chain is: GitHub -> Supabase (/auth/v1/callback) -> here. GitHub never
 * redirects to this route directly; the GitHub OAuth App's callback URL points
 * at Supabase, not at us.
 *
 * Supabase hands us a short-lived `code`, which we exchange for a session and
 * write to cookies.
 */
/**
 * Only a same-site path is an acceptable landing spot. `next` arrives in the
 * URL, so treat it as hostile: a leading `//` or a `scheme:` would let the
 * redirect leave the site (or, concatenated onto the origin, throw). Anything
 * that isn't a clean single-slash path falls back to the home page.
 */
function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        // Behind Vercel's proxy `origin` is the internal host, so prefer the
        // forwarded one. Locally there is no proxy and origin is correct.
        const forwardedHost = request.headers.get("x-forwarded-host");
        const isLocal = process.env.NODE_ENV === "development";
        const base =
          !isLocal && forwardedHost ? `https://${forwardedHost}` : origin;
        return NextResponse.redirect(`${base}${next}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/?auth_error=1`);
}
