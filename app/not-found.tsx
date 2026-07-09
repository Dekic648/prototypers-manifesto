import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ParticleField from "@/components/ui/particle-field";

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen w-full flex-col items-center justify-center px-6 text-center text-white">
      <ParticleField />

      <div className="relative z-10 max-w-lg">
        <p className="font-mono text-sm uppercase tracking-[0.3em] text-purple-400/80">
          404
        </p>
        <h1 className="mt-4 bg-gradient-to-b from-white to-gray-400 bg-clip-text text-3xl font-bold tracking-tighter text-transparent sm:text-5xl">
          This one was never prototyped.
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-gray-400">
          No question, no prototype. The page you&rsquo;re after doesn&rsquo;t
          exist &mdash; yet.
        </p>

        <Link
          href="/"
          className="mt-8 inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-5 py-2 text-sm text-gray-200 transition-colors hover:bg-purple-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
        >
          <ArrowLeft className="h-4 w-4 text-purple-400" />
          Back to the manifesto
        </Link>
      </div>
    </main>
  );
}
