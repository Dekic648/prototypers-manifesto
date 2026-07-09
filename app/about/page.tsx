import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ParticleField from "@/components/ui/particle-field";

export const metadata: Metadata = {
  title: "About — The Cult of Prototyping",
  description:
    "Why the Cult of Prototyping exists: a debt to the Cult of Done, a quarrel with the build-it-right-versus-just-build-it wars, and one request — try.",
};

export default function AboutPage() {
  return (
    <main className="relative min-h-screen w-full text-white">
      <ParticleField />

      <article className="relative z-10 mx-auto max-w-2xl px-6 py-20 sm:py-24">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-purple-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
        >
          <ArrowLeft className="h-4 w-4" />
          The manifesto
        </Link>

        <h1 className="mt-8 bg-gradient-to-b from-white to-gray-400 bg-clip-text text-3xl font-bold tracking-tighter text-transparent sm:text-5xl">
          Where this comes from
        </h1>

        <div className="mt-8 space-y-6 text-lg leading-relaxed text-gray-300">
          <p>
            This began with a debt and a disagreement.
          </p>

          <p>
            The debt is to the{" "}
            <a
              href="https://medium.com/@bre/the-cult-of-done-manifesto-724ca1c2ff13"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 underline-offset-4 transition-colors hover:text-purple-300 hover:underline"
            >
              Cult of Done
            </a>
            . In 2009 Bre Pettis and Kio Stark wrote thirteen lines about the
            liberating power of finishing things — that there are three states of
            being, <em>not knowing, action, and completion</em>; that everything
            is a draft; that done is the engine of more. It gave a generation of
            makers permission to stop polishing and start shipping.
          </p>

          <p>
            The disagreement is newer. Somewhere along the way, building split
            into two camps that don&rsquo;t much like each other. On one side:
            architecture, planning, do-it-right-the-first-time, the diagram
            before the code. On the other: move fast, prototype, vibe-code,
            figure it out by making it. Each is certain the other is how things
            go wrong.
          </p>

          <p className="text-gray-100">
            We think the argument is a trap. You don&rsquo;t learn whether an
            idea deserves an architecture until you&rsquo;ve built a rough
            version of it. You don&rsquo;t earn the right to plan carefully until
            you&rsquo;ve prototyped badly. The systematic and the scrappy
            aren&rsquo;t enemies — the prototype is how you decide which one the
            moment deserves.
          </p>

          <p>
            So the Cult of Prototyping asks for one thing:{" "}
            <strong className="font-semibold text-white">try</strong>. Not to win
            the debate. Not to do it right. Just to make the smallest real
            version of the thing in your head, and see what it teaches you.
          </p>

          <p>
            Everybody should build something. The prototype is the cheapest way
            to think, the fastest way to learn, and the only honest way to find
            out whether you were right. You don&rsquo;t need permission, a plan,
            or even a good idea. You need a question, and the nerve to answer it
            badly.
          </p>

          <p className="text-gray-100">Then answer it again.</p>
        </div>

        <p className="mt-12 border-t border-gray-800 pt-8 font-medium text-gray-400">
          Build to think.
        </p>
      </article>
    </main>
  );
}
