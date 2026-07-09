"use client";

import React from "react";
import { SquarePen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSuggest } from "./suggest-provider";

/**
 * The pencil beside a principle. Shown to everyone, signed in or not — hiding
 * it until you authenticate means nobody discovers the manifesto is editable,
 * so nobody signs in. Sign-in is asked for at submit, once the words are typed.
 *
 * Depends on no database data, so it renders in the static HTML with no
 * hydration risk. Only the counts (later) have to wait for a fetch.
 *
 * Revealed on hover and focus for pointers; permanently visible for touch,
 * where hover doesn't exist.
 */
export function SuggestButton({
  principleId,
  originalText,
  className,
}: {
  principleId: string;
  originalText: string;
  className?: string;
}) {
  const { enabled, open } = useSuggest();
  if (!enabled) return null;

  return (
    <button
      type="button"
      onClick={() => open({ kind: "edit", principleId, originalText })}
      title="Suggest an edit"
      aria-label="Suggest an edit to this principle"
      className={cn(
        "shrink-0 rounded-full p-1.5 text-gray-600 transition-all",
        "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
        "[@media(pointer:coarse)]:opacity-100",
        "hover:bg-purple-500/10 hover:text-purple-300",
        "focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400",
        className,
      )}
    >
      <SquarePen className="h-4 w-4" />
    </button>
  );
}
