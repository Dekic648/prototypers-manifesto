"use client";

import React from "react";
import Image from "next/image";
import { Dialog } from "radix-ui";
import { Clock, X } from "lucide-react";
import { displayName } from "@/lib/suggestions";
import type { Suggestion } from "@/lib/types";

const AVATAR_HOST = "avatars.githubusercontent.com";

function safeAvatar(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname === AVATAR_HOST ? url : null;
  } catch {
    return null;
  }
}

function Author({ suggestion }: { suggestion: Suggestion }) {
  const name = displayName(suggestion);
  const avatar = safeAvatar(suggestion.author_avatar_url);
  return (
    <div className="flex items-center gap-2">
      {avatar ? (
        <Image src={avatar} alt="" width={20} height={20} className="h-5 w-5 rounded-full" />
      ) : (
        // Email sign-ups have no avatar. An initial, never a broken image.
        <span
          aria-hidden="true"
          className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-500/25 text-[10px] font-semibold uppercase text-purple-200"
        >
          {name.slice(0, 1)}
        </span>
      )}
      <span className="text-xs text-gray-500">{name}</span>
    </div>
  );
}

export function SuggestionsPanel({
  principleId,
  suggestions,
  onClose,
}: {
  principleId: string;
  suggestions: Suggestion[];
  onClose: () => void;
}) {
  const original = suggestions[0]?.original_text ?? null;

  return (
    <Dialog.Root open onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-purple-500/20 bg-[#0b0b0f] shadow-2xl focus:outline-none"
        >
          <div className="flex items-start justify-between border-b border-gray-800 p-6">
            <div className="pr-6">
              <Dialog.Title className="text-lg font-semibold text-gray-100">
                Suggestions
              </Dialog.Title>
              {original && (
                <blockquote className="mt-2 border-l-2 border-gray-700 pl-3 text-sm italic leading-relaxed text-gray-500">
                  {original}
                </blockquote>
              )}
            </div>
            <Dialog.Close
              aria-label="Close"
              className="shrink-0 rounded-full p-1 text-gray-500 transition-colors hover:text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
            >
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <ul className="flex-1 space-y-4 overflow-y-auto p-6" data-principle={principleId}>
            {suggestions.map((s) => (
              <li
                key={s.id}
                className="rounded-xl border border-gray-800 bg-black/30 p-4"
              >
                {s.status === "pending" && (
                  <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-purple-500/10 px-2 py-0.5 text-xs text-purple-300">
                    <Clock className="h-3 w-3" />
                    Awaiting review — only you can see this
                  </p>
                )}
                <p className="text-base leading-relaxed text-gray-100">
                  {s.proposed_text}
                </p>
                {s.rationale && (
                  <p className="mt-2 text-sm leading-relaxed text-gray-500">
                    {s.rationale}
                  </p>
                )}
                <div className="mt-3">
                  <Author suggestion={s} />
                </div>
              </li>
            ))}
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
