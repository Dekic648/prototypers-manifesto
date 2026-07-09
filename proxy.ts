import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/session";

/**
 * Next 16 renamed the `middleware` file convention to `proxy`. Supabase's own
 * docs still show the old name — this is the same thing under the current API.
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Everything except static assets, image optimisation, and the favicon.
    // Keeping assets out matters: this runs on every request it matches.
    //
    // `api` is excluded too. Those routes authenticate with a shared secret
    // rather than a cookie, so refreshing a session for them would spend a
    // round-trip to Supabase on every call and refresh nothing.
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
