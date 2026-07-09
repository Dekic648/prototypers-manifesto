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
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

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
