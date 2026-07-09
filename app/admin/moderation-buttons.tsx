"use client";

import React from "react";
import { Check, Loader2, RotateCcw, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SuggestionStatus } from "@/lib/types";
import {
  approveSuggestion,
  deleteSuggestion,
  rejectSuggestion,
  unapproveSuggestion,
} from "./actions";

const primary =
  "inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/15 px-4 py-1.5 text-sm text-gray-100 transition-colors hover:bg-purple-500/25 disabled:opacity-40";
const quiet =
  "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm text-gray-500 transition-colors hover:text-gray-300 disabled:opacity-40";
const danger =
  "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm text-gray-600 transition-colors hover:text-red-400 disabled:opacity-40";
const ring =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400";

export function ModerationButtons({
  id,
  status,
}: {
  id: string;
  status: SuggestionStatus;
}) {
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [confirming, setConfirming] = React.useState(false);

  const run = (action: (id: string) => Promise<void>) => {
    setError(null);
    startTransition(async () => {
      try {
        await action(id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  };

  const spinner = pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null;

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      {status !== "approved" && (
        <button type="button" disabled={pending} onClick={() => run(approveSuggestion)} className={cn(primary, ring)}>
          {spinner ?? <Check className="h-3.5 w-3.5" />}
          {status === "rejected" ? "Approve after all" : "Approve"}
        </button>
      )}

      {status === "approved" && (
        <button type="button" disabled={pending} onClick={() => run(unapproveSuggestion)} className={cn(primary, ring)}>
          {spinner ?? <RotateCcw className="h-3.5 w-3.5" />}
          Unapprove
        </button>
      )}

      {status !== "rejected" && (
        <button type="button" disabled={pending} onClick={() => run(rejectSuggestion)} className={cn(quiet, ring)}>
          <X className="h-3.5 w-3.5" />
          Reject
        </button>
      )}

      {/* Delete is irreversible and cascades to votes, so it asks twice. */}
      {confirming ? (
        <span className="inline-flex items-center gap-2 text-sm text-gray-500">
          Delete permanently?
          <button type="button" disabled={pending} onClick={() => run(deleteSuggestion)} className={cn(danger, "text-red-400", ring)}>
            Yes, delete
          </button>
          <button type="button" onClick={() => setConfirming(false)} className={cn(quiet, ring)}>
            Cancel
          </button>
        </span>
      ) : (
        <button type="button" disabled={pending} onClick={() => setConfirming(true)} className={cn(danger, ring)} aria-label="Delete permanently">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}

      {error && (
        <p role="alert" className="w-full text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
