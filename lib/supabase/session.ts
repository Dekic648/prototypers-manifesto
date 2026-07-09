import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase auth cookie so a session doesn't expire mid-visit.
 *
 * Called from proxy.ts on every matched request. It only touches cookies — it
 * never reads the database and never rewrites the response body, so `/` stays
 * statically prerendered. (The proxy runs per-request at the edge; it does not
 * opt a route out of static generation. Confirmed in the build output.)
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // No Supabase configured (a fresh clone with no .env.local). Pass through
  // rather than throwing — the manifesto must still render.
  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Do not remove. This call is what actually refreshes the token, and the
  // cookie writes above only happen as a side effect of it.
  await supabase.auth.getUser();

  return response;
}
