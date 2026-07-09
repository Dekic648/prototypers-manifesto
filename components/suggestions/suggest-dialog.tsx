"use client";

import React from "react";
import { Dialog } from "radix-ui";
import { Check, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { MAX_PROPOSED_TEXT, MAX_RATIONALE, type SuggestionDraft } from "@/lib/types";

/** lucide dropped brand icons in v1. */
function GithubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" fill="currentColor" className={className}>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

const field =
  "w-full resize-none rounded-lg border border-purple-500/20 bg-black/40 px-3 py-2 " +
  "text-base leading-relaxed text-gray-100 placeholder:text-gray-600 " +
  "focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/50";

type Props = {
  draft: SuggestionDraft;
  signedIn: boolean;
  submitting: boolean;
  error: string | null;
  done: boolean;
  onChange: (d: SuggestionDraft) => void;
  onSubmit: () => void;
  onClose: () => void;
};

export function SuggestDialog({
  draft,
  signedIn,
  submitting,
  error,
  done,
  onChange,
  onSubmit,
  onClose,
}: Props) {
  const isEdit = draft.kind === "edit";
  const tooLong = draft.proposedText.length > MAX_PROPOSED_TEXT;
  const unchanged =
    isEdit && draft.proposedText.trim() === (draft.originalText ?? "").trim();

  return (
    <Dialog.Root open onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2",
            "rounded-2xl border border-purple-500/20 bg-[#0b0b0f] p-6 shadow-2xl",
            "focus:outline-none",
          )}
        >
          <Dialog.Close
            aria-label="Close"
            className="absolute right-4 top-4 rounded-full p-1 text-gray-500 transition-colors hover:text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
          >
            <X className="h-4 w-4" />
          </Dialog.Close>

          {done ? (
            <div className="py-6 text-center">
              <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/15">
                <Check className="h-5 w-5 text-purple-400" />
              </div>
              <Dialog.Title className="mb-2 text-lg font-semibold text-gray-100">
                Thank you — it&rsquo;s awaiting review
              </Dialog.Title>
              <Dialog.Description className="text-sm leading-relaxed text-gray-400">
                The wording of a manifesto is deliberate, so every suggestion is
                read before it appears. Yours is visible to you in the meantime.
              </Dialog.Description>
              <button
                type="button"
                onClick={onClose}
                className="mt-6 rounded-full border border-purple-500/30 bg-purple-500/10 px-5 py-2 text-sm text-gray-200 transition-colors hover:bg-purple-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              <Dialog.Title className="mb-1 pr-8 text-lg font-semibold text-gray-100">
                {isEdit ? "Suggest an edit" : "Suggest a new principle"}
              </Dialog.Title>
              <Dialog.Description className="mb-5 text-sm leading-relaxed text-gray-400">
                {isEdit
                  ? "Sharpen the wording. Say what the new version says that the old one doesn't."
                  : "A manifesto earns its lines. Write the one you think is missing."}
              </Dialog.Description>

              {isEdit && draft.originalText && (
                <div className="mb-4">
                  <p className="mb-1.5 text-xs uppercase tracking-wide text-gray-500">
                    As it stands
                  </p>
                  <blockquote className="border-l-2 border-gray-700 pl-3 text-sm italic leading-relaxed text-gray-500">
                    {draft.originalText}
                  </blockquote>
                </div>
              )}

              <label htmlFor="proposed" className="mb-1.5 block text-xs uppercase tracking-wide text-gray-500">
                {isEdit ? "Your version" : "Your principle"}
              </label>
              <textarea
                id="proposed"
                autoFocus
                rows={3}
                maxLength={MAX_PROPOSED_TEXT}
                value={draft.proposedText}
                onChange={(e) => onChange({ ...draft, proposedText: e.target.value })}
                placeholder={isEdit ? "" : "To prototype is to think."}
                className={field}
              />
              <p className="mb-4 mt-1 text-right text-xs text-gray-600">
                {draft.proposedText.length}/{MAX_PROPOSED_TEXT}
              </p>

              <label htmlFor="rationale" className="mb-1.5 block text-xs uppercase tracking-wide text-gray-500">
                Why is this better? <span className="normal-case text-gray-600">(optional)</span>
              </label>
              <textarea
                id="rationale"
                rows={2}
                maxLength={MAX_RATIONALE}
                value={draft.rationale}
                onChange={(e) => onChange({ ...draft, rationale: e.target.value })}
                className={cn(field, "mb-4")}
              />

              {error && (
                <p role="alert" className="mb-3 text-sm text-red-400">
                  {error}
                </p>
              )}

              {!signedIn && (
                <p className="mb-4 text-xs leading-relaxed text-gray-500">
                  You&rsquo;ll be asked to sign in when you submit. Your words are
                  kept and sent for you when you come back.
                </p>
              )}

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full px-4 py-2 text-sm text-gray-400 transition-colors hover:text-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onSubmit}
                  disabled={submitting || tooLong || !draft.proposedText.trim() || unchanged}
                  className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/15 px-5 py-2 text-sm font-medium text-gray-100 transition-colors hover:bg-purple-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending
                    </>
                  ) : signedIn ? (
                    "Submit for review"
                  ) : (
                    <>
                      <GithubMark className="h-4 w-4 text-purple-400" />
                      Sign in and submit
                    </>
                  )}
                </button>
              </div>
              {unchanged && (
                <p className="mt-2 text-right text-xs text-gray-600">
                  Change the wording to submit.
                </p>
              )}
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
