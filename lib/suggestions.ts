import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Suggestion, SuggestionDraft } from "@/lib/types";

const DRAFT_KEY = "manifesto:suggestion-draft";

/**
 * The draft survives the GitHub OAuth round-trip. sessionStorage rather than
 * localStorage: an abandoned draft should not still be waiting next week.
 */
export function saveDraft(draft: SuggestionDraft) {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Private mode, or storage full. The suggestion is lost, not the page.
  }
}

export function readDraft(): SuggestionDraft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SuggestionDraft;
    return typeof parsed?.proposedText === "string" ? parsed : null;
  } catch {
    return null;
  }
}

export function clearDraft() {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    /* nothing to do */
  }
}

/** Both are null for email sign-ups; every render site needs a fallback. */
function identity(user: User) {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const login = meta.user_name ?? meta.preferred_username;
  const avatar = meta.avatar_url;
  return {
    author_github_login: typeof login === "string" ? login : null,
    author_avatar_url: typeof avatar === "string" ? avatar : null,
  };
}

/**
 * Every suggestion the caller is allowed to see, of both kinds.
 *
 * There is no `status` filter here on purpose. The SELECT policy is
 * `status = 'approved' or author_id = auth.uid()`, so an anonymous reader gets
 * only approved rows while an author additionally gets their own pending ones.
 * Filtering in the client would be a second, weaker copy of that rule.
 *
 * Fails soft: a paused free-tier project returns [] rather than throwing, and
 * the manifesto renders without bubbles.
 */
export async function fetchSuggestions(
  supabase: SupabaseClient,
): Promise<Suggestion[]> {
  const { data, error } = await supabase
    .from("suggestions")
    .select("*")
    .order("vote_count", { ascending: false })
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as Suggestion[];
}

/** The ids this user has already upvoted. Empty when signed out. */
export async function fetchMyVotes(
  supabase: SupabaseClient,
  userId: string,
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("votes")
    .select("suggestion_id")
    .eq("voter_id", userId);

  if (error || !data) return new Set();
  return new Set(data.map((v) => v.suggestion_id as string));
}

/**
 * Upvotes are a row in `votes`, not a counter. `unique (suggestion_id, voter_id)`
 * is what makes one-vote-per-person true, and a trigger keeps `vote_count` in
 * step — so un-voting is a delete, and the count follows.
 *
 * The insert policy also requires the suggestion to be `approved`, so a pending
 * row cannot be voted on even by its own author.
 */
export async function toggleVote(
  supabase: SupabaseClient,
  userId: string,
  suggestionId: string,
  hasVoted: boolean,
): Promise<SubmitResult> {
  if (hasVoted) {
    const { error } = await supabase
      .from("votes")
      .delete()
      .eq("suggestion_id", suggestionId)
      .eq("voter_id", userId);
    return error ? { ok: false, message: error.message } : { ok: true };
  }

  const { error } = await supabase
    .from("votes")
    .insert({ suggestion_id: suggestionId, voter_id: userId });

  if (!error) return { ok: true };
  // 23505 = unique violation: they already voted, in another tab.
  if (error.code === "23505") return { ok: true };
  return { ok: false, message: error.message };
}

const VOTE_INTENT_KEY = "manifesto:vote-intent";

/** Like the draft, a vote survives the GitHub round-trip. */
export function saveVoteIntent(suggestionId: string) {
  try {
    sessionStorage.setItem(VOTE_INTENT_KEY, suggestionId);
  } catch {
    /* private mode */
  }
}

export function takeVoteIntent(): string | null {
  try {
    const id = sessionStorage.getItem(VOTE_INTENT_KEY);
    if (id) sessionStorage.removeItem(VOTE_INTENT_KEY);
    return id;
  } catch {
    return null;
  }
}

/** Group by principle slug, preserving the order the query returned. */
export function groupByPrinciple(rows: Suggestion[]) {
  const map = new Map<string, Suggestion[]>();
  for (const row of rows) {
    if (!row.principle_id) continue;
    const list = map.get(row.principle_id);
    if (list) list.push(row);
    else map.set(row.principle_id, [row]);
  }
  return map;
}

/** Both are null for email sign-ups. Never render a bare `null` as a name. */
export function displayName(s: Suggestion) {
  return s.author_github_login ?? "a reader";
}

export type SubmitResult =
  | { ok: true }
  | { ok: false; message: string };

/**
 * Inserts a suggestion as the signed-in user.
 *
 * `status` is deliberately never sent. The insert policy requires it to be
 * 'pending', and there is no policy anywhere that lets a client write
 * 'approved' — approval happens only through the service role.
 */
export async function createSuggestion(
  supabase: SupabaseClient,
  user: User,
  draft: SuggestionDraft,
): Promise<SubmitResult> {
  const { error } = await supabase.from("suggestions").insert({
    kind: draft.kind,
    principle_id: draft.kind === "edit" ? draft.principleId : null,
    original_text: draft.kind === "edit" ? draft.originalText : null,
    proposed_text: draft.proposedText.trim(),
    rationale: draft.rationale.trim() || null,
    author_id: user.id,
    ...identity(user),
  });

  if (!error) return { ok: true };

  // 42501 is "violates row-level security policy". At this point the user is
  // authenticated and inserting as themselves, so in practice the only clause
  // that can still reject them is the rate limit.
  if (error.code === "42501") {
    return {
      ok: false,
      message: "You've reached the limit of 5 suggestions an hour. Try again later.",
    };
  }
  if (error.code === "23514") {
    return { ok: false, message: "That doesn't fit — keep it under 500 characters." };
  }
  return { ok: false, message: error.message || "Something went wrong. Try again." };
}
