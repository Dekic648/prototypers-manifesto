"use client";

import React from "react";
import { AlertTriangle, X } from "lucide-react";

/**
 * Surfaces a failed sign-in.
 *
 * Supabase reports OAuth failures in the URL *hash* (`#error=...&
 * error_description=...`). Browsers never send a fragment to the server, so
 * app/auth/callback/route.ts cannot see it — all it can do is notice the
 * missing `code` and redirect to `/?auth_error=1`. The real reason is therefore
 * only readable here, on the client.
 *
 * We read both: the hash (Supabase's reason) and `?auth_error=1` (our route's
 * flag), so a failure is still reported if only one of them is present.
 */
type AuthError = { code: string | null; description: string | null };

function readAuthError(): AuthError | null {
  const query = new URLSearchParams(window.location.search);
  // Strip the leading "#". The fragment is x-www-form-urlencoded, same as a
  // query string, so URLSearchParams parses it (and turns "+" back into " ").
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));

  const hashError = hash.get("error");
  const flagged = query.get("auth_error") === "1";
  if (!hashError && !flagged) return null;

  return {
    code: hash.get("error_code") ?? hashError,
    description: hash.get("error_description"),
  };
}

// The URL is an external store, read once. `undefined` means "not yet read";
// caching keeps getSnapshot referentially stable, which useSyncExternalStore
// requires — recomputing a fresh object each call would loop forever. It also
// means the banner survives scrubUrl() below.
let snapshot: AuthError | null | undefined;

function getSnapshot(): AuthError | null {
  if (snapshot === undefined) snapshot = readAuthError();
  return snapshot;
}

// There is no window on the server, and nothing to report during hydration.
// React renders this first, then swaps in getSnapshot() once hydrated — so the
// banner appears without ever causing a hydration mismatch.
function getServerSnapshot(): AuthError | null {
  return null;
}

// The URL never changes underneath us here, so there is nothing to subscribe to.
function subscribe(): () => void {
  return () => {};
}

/** Remove the error params so a refresh (or a copied URL) doesn't replay it. */
function scrubUrl() {
  const url = new URL(window.location.href);
  url.hash = "";
  url.searchParams.delete("auth_error");
  window.history.replaceState({}, "", url.pathname + url.search);
}

export function AuthErrorNotice() {
  const error = React.useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const [dismissed, setDismissed] = React.useState(false);

  // Side effects only — no setState, so no cascading render.
  React.useEffect(() => {
    if (!error) return;
    console.error("Sign-in failed:", error.code, error.description);
    scrubUrl();
  }, [error]);

  if (!error || dismissed) return null;

  return (
    <div
      role="alert"
      className="fixed left-1/2 top-4 z-50 w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 rounded-lg border border-red-500/30 bg-red-950/80 px-4 py-3 backdrop-blur-sm"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
        <div className="flex-1 text-sm">
          <p className="font-medium text-red-100">Sign-in failed</p>
          <p className="mt-1 text-red-200/80">
            {error.description ?? "The provider rejected the sign-in attempt."}
          </p>
          {error.code && (
            <p className="mt-1 font-mono text-xs text-red-300/60">
              {error.code}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="shrink-0 rounded p-1 text-red-300/70 transition-colors hover:bg-red-500/10 hover:text-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default AuthErrorNotice;
