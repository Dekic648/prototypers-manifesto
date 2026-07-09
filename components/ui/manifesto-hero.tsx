"use client";

import React from "react";
import { motion, type Variants } from "framer-motion";
import { Hammer } from "lucide-react";

/**
 * A principle's `id` is a stable, immutable slug. It is the key that
 * suggestions and votes are stored against, so it must never be renamed once
 * shipped — renaming orphans every suggestion attached to it. Reordering the
 * array is safe: the displayed number is derived from position, not from `id`.
 */
type Principle = {
  id: string;
  text: string;
  isQuote?: boolean;
};

const PRINCIPLES: Principle[] = [
  {
    id: "answer-to-a-question",
    text: "A prototype is an answer to a question. No question, no prototype.",
  },
  {
    id: "learn-first-prove-second",
    text: "Prototype first to learn, second to prove.",
  },
  {
    id: "ten-wrong-things",
    text: "Build ten wrong things to find the one that isn't.",
  },
  {
    id: "taste-through-prototypes",
    text: "Taste is demonstrated through prototypes, not opinions.",
  },
  {
    id: "taste-survives-bad-prototypes",
    text: "Taste is what survives your own bad prototypes.",
  },
  { id: "prototype-is-to-think", text: "To prototype is to think." },
  { id: "production-over-perfection", text: "Production over perfection." },
  {
    id: "worth-a-thousand-discussions",
    text: "One prototype is worth a thousand discussions.",
  },
  {
    id: "every-idea-deserves-a-prototype",
    text: "Even the shittiest idea deserves to be prototyped.",
  },
  {
    id: "fears-two-families",
    text: "Fears about prototyping fall into two families: fears about yourself and fears about your reception by others.",
    isQuote: true,
  },
];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.08 + 0.3,
      duration: 0.7,
      ease: "easeInOut",
    },
  }),
};

export function ManifestoHero() {
  return (
    <div className="relative z-10 mx-auto flex max-w-3xl flex-col px-6 py-20 sm:py-28">
      {/* Header */}
      <header className="text-center">
        <motion.div
          custom={0}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-4 py-1.5 backdrop-blur-sm"
        >
          <Hammer className="h-4 w-4 text-purple-400" />
          <span className="text-sm font-medium text-gray-200">
            The Prototyper&rsquo;s Manifesto
          </span>
        </motion.div>

        <motion.h1
          custom={1}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mb-6 bg-gradient-to-b from-white to-gray-400 bg-clip-text text-4xl font-bold tracking-tighter text-transparent sm:text-6xl md:text-7xl"
        >
          The Cult of Prototyping
        </motion.h1>

        <motion.p
          custom={2}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mb-10 text-xl font-medium text-gray-200 sm:text-2xl"
        >
          I prototype, therefore I am.
        </motion.p>

        <motion.blockquote
          custom={3}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mx-auto max-w-2xl border-l-2 border-purple-500/40 pl-5 text-left"
        >
          <p className="text-base italic leading-relaxed text-gray-400 sm:text-lg">
            &ldquo;The function of the overwhelming majority of your artwork is
            simply to teach you how to make the small fraction of your artwork
            that soars.&rdquo;
          </p>
          <footer className="mt-3 text-sm text-gray-500">
            &mdash; David Bayles and Ted Orland
          </footer>
        </motion.blockquote>
      </header>

      {/* The 10 principles */}
      <ol className="mt-20 flex flex-col gap-8">
        {PRINCIPLES.map((principle, index) => (
          <motion.li
            key={principle.id}
            custom={index + 4}
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="flex items-baseline gap-5"
          >
            <span className="shrink-0 font-mono text-lg font-semibold tabular-nums text-purple-400/90 sm:text-xl">
              {String(index + 1).padStart(2, "0")}
            </span>
            <p
              data-principle-id={principle.id}
              className={
                principle.isQuote
                  ? "text-lg italic leading-relaxed text-gray-300 sm:text-xl"
                  : "text-lg leading-relaxed text-gray-100 sm:text-xl"
              }
            >
              {principle.isQuote ? (
                <>
                  &ldquo;{principle.text}&rdquo;
                  <span className="mt-1 block text-sm not-italic text-gray-500">
                    &mdash; David Bayles and Ted Orland
                  </span>
                </>
              ) : (
                principle.text
              )}
            </p>
          </motion.li>
        ))}
      </ol>

      <footer className="mt-24 text-center text-sm text-gray-500">
        <p>
          An open manifesto for people who build to think.{" "}
          <a
            href="https://github.com/Dekic648/prototypers-manifesto"
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-400 underline-offset-4 transition-colors hover:text-purple-300 hover:underline"
          >
            Contribute on GitHub
          </a>
          .
        </p>
      </footer>
    </div>
  );
}

export default ManifestoHero;
