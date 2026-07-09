"use client";

import React from "react";
import Image from "next/image";
import { Clock } from "lucide-react";
import { displayName } from "@/lib/suggestions";
import type { Suggestion } from "@/lib/types";
import { useSuggest } from "./suggest-provider";
import { VoteButton } from "./vote-button";

const AVATAR_HOST = "avatars.githubusercontent.com";

function safeAvatar(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname === AVATAR_HOST ? url : null;
  } catch {
    return null;
  }
}

function Proposal({ suggestion }: { suggestion: Suggestion }) {
  const name = displayName(suggestion);
  const avatar = safeAvatar(suggestion.author_avatar_url);
  const pending = suggestion.status === "pending";

  return (
    <li className="flex items-start gap-4">
      <VoteButton suggestion={suggestion} />
      <div className="min-w-0 flex-1">
        {pending && (
          <p className="mb-1 inline-flex items-center gap-1.5 text-xs text-purple-300/80">
            <Clock className="h-3 w-3" />
            Awaiting review — only you can see this
          </p>
        )}
        <p className="text-lg leading-relaxed text-gray-200 sm:text-xl">
          {suggestion.proposed_text}
        </p>
        {suggestion.rationale && (
          <p className="mt-1 text-sm leading-relaxed text-gray-500">
            {suggestion.rationale}
          </p>
        )}
        <div className="mt-2 flex items-center gap-2">
          {avatar ? (
            <Image src={avatar} alt="" width={16} height={16} className="h-4 w-4 rounded-full" />
          ) : (
            // Email sign-ups have no avatar. An initial, never a broken image.
            <span
              aria-hidden="true"
              className="flex h-4 w-4 items-center justify-center rounded-full bg-purple-500/25 text-[9px] font-semibold uppercase text-purple-200"
            >
              {name.slice(0, 1)}
            </span>
          )}
          <span className="text-xs text-gray-600">{name}</span>
        </div>
      </div>
    </li>
  );
}

/**
 * Renders nothing until there is something to show, so the server render and
 * the first client render agree. Ordering is `vote_count desc` straight from
 * the query — the trigger owns that number, not this component.
 */
export function ProposedPrinciples() {
  const { enabled, proposals } = useSuggest();
  if (!enabled || proposals.length === 0) return null;

  return (
    <section className="mt-14">
      <h2 className="mb-1 text-sm uppercase tracking-wide text-gray-500">
        Proposed by readers
      </h2>
      <p className="mb-6 text-sm leading-relaxed text-gray-600">
        Not part of the manifesto — yet. The ten above change only by commit.
      </p>
      {/* Realtime insertions and vote changes are announced to screen readers. */}
      <ul aria-live="polite" className="flex flex-col gap-7">
        {proposals.map((s) => (
          <Proposal key={s.id} suggestion={s} />
        ))}
      </ul>
    </section>
  );
}
