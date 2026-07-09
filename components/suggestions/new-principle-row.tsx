"use client";

import React from "react";
import { motion, type Variants } from "framer-motion";
import { Plus } from "lucide-react";
import { useSuggest } from "./suggest-provider";

/**
 * Uses `animate`, not `whileInView`. The principles above animate on scroll
 * with `viewport={{ once: true }}`, but this row can mount already inside the
 * viewport — and a fire-once viewport animation on an element that is already
 * in view may never fire, leaving it stuck at opacity 0.
 */
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08 + 0.3, duration: 0.7, ease: "easeInOut" },
  }),
};

/**
 * The unwritten principle, sitting where an eleventh would be.
 *
 * A "+" rather than the number 11: a number would assert that an eleventh
 * principle exists, when what we mean is that the list is open. The whole row
 * is the click target — a bare icon is a small thing to hit on a phone.
 */
export function NewPrincipleRow({ order }: { order: number }) {
  const { enabled, open } = useSuggest();
  if (!enabled) return null;

  return (
    <motion.li
      custom={order}
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="mt-2"
    >
      <button
        type="button"
        onClick={() => open({ kind: "new_principle" })}
        className="group/new flex w-full items-baseline gap-5 rounded-lg py-1 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
      >
        <span
          aria-hidden="true"
          className="shrink-0 text-purple-400/40 transition-colors group-hover/new:text-purple-400/90"
        >
          <Plus className="h-5 w-5" strokeWidth={2.5} />
        </span>
        <span className="flex-1 border-b border-dashed border-gray-700 pb-1 text-lg leading-relaxed text-gray-600 transition-colors group-hover/new:border-purple-500/40 group-hover/new:text-gray-400 sm:text-xl">
          Suggest a new principle
        </span>
      </button>
    </motion.li>
  );
}
