"use client";

import React from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  clearDraft,
  createSuggestion,
  fetchMyVotes,
  fetchSuggestions,
  groupByPrinciple,
  readDraft,
  saveDraft,
  saveVoteIntent,
  takeVoteIntent,
  toggleVote,
} from "@/lib/suggestions";
import type { Suggestion, SuggestionDraft, SuggestionKind } from "@/lib/types";
import { SuggestDialog } from "./suggest-dialog";
import { SuggestionsPanel } from "./suggestions-panel";

type OpenArgs = {
  kind: SuggestionKind;
  principleId?: string;
  originalText?: string;
};

type Ctx = {
  enabled: boolean;
  open: (args: OpenArgs) => void;
  openPanel: (principleId: string) => void;
  /** Everything the current viewer may see: approved, plus their own pending. */
  forPrinciple: (principleId: string) => Suggestion[];
  /** Approved new-principle proposals, most-voted first. */
  proposals: Suggestion[];
  hasVoted: (suggestionId: string) => boolean;
  vote: (suggestionId: string) => void;
};

const SuggestContext = React.createContext<Ctx>({
  enabled: false,
  open: () => {},
  openPanel: () => {},
  forPrinciple: () => [],
  proposals: [],
  hasVoted: () => false,
  vote: () => {},
});

export function useSuggest() {
  return React.useContext(SuggestContext);
}

const emptyDraft = (args: OpenArgs): SuggestionDraft => ({
  kind: args.kind,
  principleId: args.principleId ?? null,
  originalText: args.originalText ?? null,
  proposedText: args.kind === "edit" ? (args.originalText ?? "") : "",
  rationale: "",
});

export function SuggestProvider({ children }: { children: React.ReactNode }) {
  const supabase = React.useMemo(() => createClient(), []);
  const [user, setUser] = React.useState<User | null>(null);
  const [draft, setDraft] = React.useState<SuggestionDraft | null>(null);
  const [panelFor, setPanelFor] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  // Both start empty so the server render and the first client render agree:
  // no bubbles, no proposals. They appear once the fetch resolves. A count
  // rendered during SSR would be a guaranteed hydration mismatch.
  const [rows, setRows] = React.useState<Suggestion[]>([]);
  const [myVotes, setMyVotes] = React.useState<Set<string>>(() => new Set());

  // Realtime callbacks and the debounce timer need the current user without
  // re-subscribing every time it changes.
  const userRef = React.useRef<User | null>(null);
  const rememberUser = React.useCallback((who: User | null) => {
    userRef.current = who;
    setUser(who);
  }, []);

  const load = React.useCallback(
    async (client: SupabaseClient, who: User | null) => {
      const [fetched, votes] = await Promise.all([
        fetchSuggestions(client),
        who ? fetchMyVotes(client, who.id) : Promise.resolve(new Set<string>()),
      ]);
      setRows(fetched);
      setMyVotes(votes);
    },
    [],
  );

  const submit = React.useCallback(
    async (d: SuggestionDraft, who: User) => {
      if (!supabase) return;
      setSubmitting(true);
      setError(null);
      const result = await createSuggestion(supabase, who, d);
      setSubmitting(false);
      if (result.ok) {
        clearDraft();
        setDone(true);
        // The author can see their own pending row, so it appears immediately
        // as "awaiting review" — for them alone.
        void load(supabase, who);
      } else {
        setError(result.message);
      }
    },
    [supabase, load],
  );

  /** Optimistic: flip locally, reconcile from the server, roll back on failure. */
  const applyVote = React.useCallback(
    async (client: SupabaseClient, who: User, id: string) => {
      const had = myVotes.has(id);
      const delta = had ? -1 : 1;

      setMyVotes((prev) => {
        const next = new Set(prev);
        if (had) next.delete(id);
        else next.add(id);
        return next;
      });
      setRows((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, vote_count: Math.max(0, r.vote_count + delta) } : r,
        ),
      );

      const result = await toggleVote(client, who.id, id, had);
      // The trigger owns vote_count. Re-read rather than trust the optimism.
      if (result.ok) void load(client, who);
      else void load(client, who);
    },
    [myVotes, load],
  );

  React.useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    let debounce: ReturnType<typeof setTimeout> | undefined;

    /**
     * Refetch rather than patch state from the change payload.
     *
     * `vote_count` is owned by a trigger, and an UPDATE payload for one row says
     * nothing about ordering across the rest. Rebuilding from a partial WAL
     * record is exactly how counts drift out of step with the votes table.
     * At this volume a refetch is cheap and always right.
     */
    const scheduleReload = () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        if (!cancelled) void load(supabase, userRef.current);
      }, 250);
    };

    // Realtime honours RLS, so an anonymous subscriber is told about a row only
    // once it is approved — the moment of approval *is* the moment it appears.
    const channel = supabase
      .channel("manifesto-suggestions")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "suggestions" },
        scheduleReload,
      )
      .subscribe();

    supabase.auth
      .getUser()
      .then(async ({ data }) => {
        if (cancelled) return;
        const who = data.user ?? null;
        rememberUser(who);
        await load(supabase, who);
        if (cancelled) return;

        // Resume whatever they were doing before the GitHub round-trip.
        const stashedVote = takeVoteIntent();
        if (who && stashedVote) {
          await applyVote(supabase, who, stashedVote);
          return;
        }

        const stashed = readDraft();
        if (!stashed) return;
        setDraft(stashed);

        if (who && stashed.submitOnReturn) {
          // Consume the intent before attempting it. If the insert fails — the
          // rate limit, say — the text stays on screen to retry by hand, and a
          // reload can't resurrect a doomed submission into an endless loop.
          clearDraft();
          void submit(stashed, who);
        }
      })
      .catch(() => {
        // Paused free-tier project or offline. The manifesto still reads fine.
        if (!cancelled) rememberUser(null);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const who = session?.user ?? null;
      rememberUser(who);
      // Signing in reveals your own pending rows and your votes; out hides them.
      void load(supabase, who);
    });
    return () => {
      cancelled = true;
      clearTimeout(debounce);
      sub.subscription.unsubscribe();
      void supabase.removeChannel(channel);
    };
    // applyVote depends on myVotes, which changes on every vote. Re-running this
    // effect then would tear down the realtime channel and refetch for nothing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, load, submit, rememberUser]);

  const open = React.useCallback((args: OpenArgs) => {
    setError(null);
    setDone(false);
    setPanelFor(null);
    setDraft(emptyDraft(args));
  }, []);

  const close = React.useCallback(() => {
    setDraft(null);
    setError(null);
    setDone(false);
    clearDraft();
  }, []);

  const signInThen = React.useCallback(async () => {
    if (!supabase) return;
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (authError) setError("Couldn't reach GitHub. Try again.");
  }, [supabase]);

  const onSubmit = React.useCallback(async () => {
    if (!draft || !supabase) return;
    if (!draft.proposedText.trim()) {
      setError("Write something first.");
      return;
    }
    if (!user) {
      // Gate at submit, not at open. They've already invested the words; stash
      // them so the redirect doesn't throw the work away.
      saveDraft({ ...draft, submitOnReturn: true });
      await signInThen();
      return;
    }
    await submit(draft, user);
  }, [draft, supabase, user, submit, signInThen]);

  const vote = React.useCallback(
    (id: string) => {
      if (!supabase) return;
      if (!user) {
        saveVoteIntent(id);
        void signInThen();
        return;
      }
      void applyVote(supabase, user, id);
    },
    [supabase, user, applyVote, signInThen],
  );

  const byPrinciple = React.useMemo(
    () => groupByPrinciple(rows.filter((r) => r.kind === "edit")),
    [rows],
  );

  const proposals = React.useMemo(
    () => rows.filter((r) => r.kind === "new_principle"),
    [rows],
  );

  const forPrinciple = React.useCallback(
    (principleId: string) => byPrinciple.get(principleId) ?? [],
    [byPrinciple],
  );

  const hasVoted = React.useCallback((id: string) => myVotes.has(id), [myVotes]);

  const enabled = isSupabaseConfigured && !!supabase;

  const value = React.useMemo(
    () => ({
      enabled,
      open,
      openPanel: setPanelFor,
      forPrinciple,
      proposals,
      hasVoted,
      vote,
    }),
    [enabled, open, forPrinciple, proposals, hasVoted, vote],
  );

  return (
    <SuggestContext.Provider value={value}>
      {children}
      {draft && (
        <SuggestDialog
          draft={draft}
          signedIn={!!user}
          submitting={submitting}
          error={error}
          done={done}
          onChange={setDraft}
          onSubmit={onSubmit}
          onClose={close}
        />
      )}
      {panelFor && (
        <SuggestionsPanel
          principleId={panelFor}
          suggestions={forPrinciple(panelFor)}
          onClose={() => setPanelFor(null)}
        />
      )}
    </SuggestContext.Provider>
  );
}
