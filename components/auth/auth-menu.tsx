"use client";

import React from "react";
import Image from "next/image";
import type { User } from "@supabase/supabase-js";
import { LogOut } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/** Must match `images.remotePatterns` in next.config.ts — next/image throws on
 *  an unlisted host, and an avatar URL is attacker-influenced user metadata. */
const AVATAR_HOST = "avatars.githubusercontent.com";

/** lucide dropped brand icons in v1, so the GitHub mark is inlined. */
function GithubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" fill="currentColor" className={className}>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

function safeAvatar(url: unknown): string | null {
  if (typeof url !== "string") return null;
  try {
    return new URL(url).hostname === AVATAR_HOST ? url : null;
  } catch {
    return null;
  }
}

/**
 * Reading the manifesto never requires an account. This only appears for the
 * people who want to suggest or vote.
 *
 * The session lives in a cookie that the statically prerendered shell knows
 * nothing about, so both the server render and the first client render show
 * "Sign in". A signed-in user sees it swap once the effect resolves. That brief
 * flash is the price of keeping `/` static, and it is the right trade for a
 * page whose entire job is to render text instantly.
 */
export function AuthMenu() {
  const [user, setUser] = React.useState<User | null>(null);
  const [busy, setBusy] = React.useState(false);
  const supabase = React.useMemo(() => createClient(), []);

  React.useEffect(() => {
    if (!supabase) return;

    // Fails soft: a paused free-tier project or a network error leaves the menu
    // in its signed-out state rather than throwing inside the layout.
    supabase.auth
      .getUser()
      .then(({ data }) => setUser(data.user ?? null))
      .catch(() => setUser(null));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  // A clone without .env.local still renders the manifesto. It just can't sign in.
  if (!isSupabaseConfigured || !supabase) return null;

  const signIn = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setBusy(false); // On success the browser navigates away.
  };

  const signOut = async () => {
    setBusy(true);
    await supabase.auth.signOut();
    setBusy(false);
  };

  const shell =
    "fixed right-4 top-4 z-20 flex items-center gap-2 rounded-full border " +
    "border-purple-500/20 bg-purple-500/10 px-3 py-1.5 text-sm backdrop-blur-sm " +
    "transition-colors disabled:opacity-50";

  if (!user) {
    return (
      <button
        type="button"
        onClick={signIn}
        disabled={busy}
        className={cn(
          shell,
          "text-gray-200 hover:bg-purple-500/20",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400",
        )}
      >
        <GithubMark className="h-4 w-4 text-purple-400" />
        <span>Sign in</span>
      </button>
    );
  }

  // Email sign-in is enabled alongside GitHub, so neither the avatar nor the
  // login is guaranteed to exist. Fall back to the email's local part, then to
  // a generic label — never to a broken image.
  const meta = user.user_metadata ?? {};
  const login: string | undefined = meta.user_name ?? meta.preferred_username;
  const avatar = safeAvatar(meta.avatar_url);
  const name = login ?? user.email?.split("@")[0] ?? "signed in";

  return (
    <div className={cn(shell, "text-gray-200")}>
      {avatar ? (
        <Image
          src={avatar}
          alt=""
          width={20}
          height={20}
          className="h-5 w-5 rounded-full"
        />
      ) : (
        <span
          aria-hidden="true"
          className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-500/30 text-[10px] font-semibold uppercase text-purple-200"
        >
          {name.slice(0, 1)}
        </span>
      )}
      <span className="max-w-[12ch] truncate">{name}</span>
      <button
        type="button"
        onClick={signOut}
        disabled={busy}
        aria-label="Sign out"
        title="Sign out"
        className="ml-1 rounded-full p-0.5 text-gray-400 transition-colors hover:text-purple-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
      >
        <LogOut className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default AuthMenu;
