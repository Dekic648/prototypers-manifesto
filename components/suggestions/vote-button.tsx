"use client";

import React from "react";
import { ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Suggestion } from "@/lib/types";
import { useSuggest } from "./suggest-provider";

/**
 * A pending suggestion cannot be voted on — the insert policy requires the
 * suggestion to be approved, so the button would only ever produce a 403. It is
 * hidden rather than disabled: there is nothing the viewer can do about it.
 */
export function VoteButton({ suggestion }: { suggestion: Suggestion }) {
  const { hasVoted, vote } = useSuggest();
  if (suggestion.status !== "approved") return null;

  const voted = hasVoted(suggestion.id);

  return (
    <button
      type="button"
      onClick={() => vote(suggestion.id)}
      aria-pressed={voted}
      aria-label={
        voted
          ? `Remove your vote. ${suggestion.vote_count} votes`
          : `Upvote. ${suggestion.vote_count} votes`
      }
      className={cn(
        "inline-flex shrink-0 flex-col items-center gap-0.5 rounded-lg border px-2 py-1 transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400",
        voted
          ? "border-purple-500/50 bg-purple-500/20 text-purple-200"
          : "border-gray-800 text-gray-500 hover:border-purple-500/30 hover:text-purple-300",
      )}
    >
      <ChevronUp className="h-4 w-4" strokeWidth={2.5} />
      <span className="font-mono text-xs tabular-nums">
        {suggestion.vote_count}
      </span>
    </button>
  );
}
