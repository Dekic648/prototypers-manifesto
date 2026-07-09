"use client";

import React from "react";
import { Check, Loader2, X } from "lucide-react";
import { approveSuggestion, rejectSuggestion } from "./actions";

export function ModerationButtons({ id }: { id: string }) {
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

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

  return (
    <div className="mt-4 flex items-center gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={() => run(approveSuggestion)}
        className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/15 px-4 py-1.5 text-sm text-gray-100 transition-colors hover:bg-purple-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 disabled:opacity-40"
      >
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
        Approve
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => run(rejectSuggestion)}
        className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm text-gray-500 transition-colors hover:text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 disabled:opacity-40"
      >
        <X className="h-3.5 w-3.5" />
        Reject
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
