import type { User } from "@supabase/supabase-js";

/**
 * A voter created by `signInAnonymously()`. They hold a real session and the
 * `authenticated` role — enough to vote, deliberately not enough to suggest.
 *
 * This distinction matters everywhere the old code asked `if (!user)`. An
 * anonymous user is truthy, so that check now answers "yes, signed in" for
 * someone who never signed in. Use `isRealUser` for anything that should
 * require a named account.
 */
export function isAnonymous(user: User | null | undefined): boolean {
  return user?.is_anonymous === true;
}

/** Signed in with a real identity (GitHub, email) — not an anonymous voter. */
export function isRealUser(user: User | null | undefined): user is User {
  return !!user && !user.is_anonymous;
}
