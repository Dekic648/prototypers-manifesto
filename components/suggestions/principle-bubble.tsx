"use client";

import React from "react";
import { MessageSquare } from "lucide-react";
import { useSuggest } from "./suggest-provider";

/**
 * The count beside a principle.
 *
 * Renders nothing until the fetch resolves. The provider seeds its state with
 * an empty map precisely so that the server render and the first client render
 * both produce nothing here — a count drawn during SSR would be a guaranteed
 * hydration mismatch, which this project has already had to fix once.
 *
 * The number is viewer-dependent by design: everyone sees approved suggestions,
 * and an author additionally sees their own pending one. That asymmetry comes
 * from the SELECT policy, not from anything this component does.
 */
export function PrincipleBubble({ principleId }: { principleId: string }) {
  const { enabled, openPanel, forPrinciple } = useSuggest();
  const suggestions = forPrinciple(principleId);
  const count = suggestions.length;

  if (!enabled || count === 0) return null;

  const pending = suggestions.filter((s) => s.status === "pending").length;

  return (
    <button
      type="button"
      onClick={() => openPanel(principleId)}
      aria-label={
        pending > 0
          ? `${count} suggestions, ${pending} of yours awaiting review`
          : `${count} suggestion${count === 1 ? "" : "s"} for this principle`
      }
      title="See suggestions"
      className="relative shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-1 text-gray-500 transition-colors hover:bg-purple-500/10 hover:text-purple-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
    >
      <MessageSquare className="h-3.5 w-3.5" />
      <span className="font-mono text-xs tabular-nums">{count}</span>
      {pending > 0 && (
        <span
          aria-hidden="true"
          title="You have a suggestion awaiting review"
          className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-purple-400"
        />
      )}
    </button>
  );
}
