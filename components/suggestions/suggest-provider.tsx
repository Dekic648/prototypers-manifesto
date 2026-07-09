"use client";

import React from "react";
import type { User } from "@supabase/supabase-js";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  clearDraft,
  createSuggestion,
  readDraft,
  saveDraft,
} from "@/lib/suggestions";
import type { SuggestionDraft, SuggestionKind } from "@/lib/types";
import { SuggestDialog } from "./suggest-dialog";

type OpenArgs = {
  kind: SuggestionKind;
  principleId?: string;
  originalText?: string;
};

type Ctx = {
  /** False when Supabase isn't configured — the affordances hide themselves. */
  enabled: boolean;
  open: (args: OpenArgs) => void;
};

const SuggestContext = React.createContext<Ctx>({ enabled: false, open: () => {} });

export function useSuggest() {
  return React.useContext(SuggestContext);
}

const emptyDraft = (args: OpenArgs): SuggestionDraft => ({
  kind: args.kind,
  principleId: args.principleId ?? null,
  originalText: args.originalText ?? null,
  // Editing starts from the current wording. Proposing starts from a blank page.
  proposedText: args.kind === "edit" ? (args.originalText ?? "") : "",
  rationale: "",
});

export function SuggestProvider({ children }: { children: React.ReactNode }) {
  const supabase = React.useMemo(() => createClient(), []);
  const [user, setUser] = React.useState<User | null>(null);
  const [draft, setDraft] = React.useState<SuggestionDraft | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

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
      } else {
        setError(result.message);
      }
    },
    [supabase],
  );

  React.useEffect(() => {
    if (!supabase) return;
    let cancelled = false;

    // Resume the OAuth round-trip. Someone pressed Submit while signed out, we
    // stashed the draft, sent them to GitHub, and they landed back here. Finish
    // the job they already asked for rather than making them retype it.
    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (cancelled) return;
        const who = data.user ?? null;
        setUser(who);

        const stashed = readDraft();
        if (!stashed) return;

        // Reopen with their words intact, whether or not they signed in.
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
        if (!cancelled) setUser(null);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [supabase, submit]);

  const open = React.useCallback((args: OpenArgs) => {
    setError(null);
    setDone(false);
    setDraft(emptyDraft(args));
  }, []);

  const close = React.useCallback(() => {
    setDraft(null);
    setError(null);
    setDone(false);
    clearDraft();
  }, []);

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
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (authError) setError("Couldn't reach GitHub. Try again.");
      return;
    }

    await submit(draft, user);
  }, [draft, supabase, user, submit]);

  const enabled = isSupabaseConfigured && !!supabase;

  const value = React.useMemo(() => ({ enabled, open }), [enabled, open]);

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
    </SuggestContext.Provider>
  );
}
