import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Suggestion } from "@/lib/types";
import { requireAdmin } from "./actions";
import { ModerationButtons } from "./moderation-buttons";

// Reads a session cookie and the live table, so it can never be prerendered.
// `/` is unaffected and stays static.
export const dynamic = "force-dynamic";

export const metadata = { robots: { index: false, follow: false } };

function when(iso: string) {
  return new Date(iso).toISOString().replace("T", " ").slice(0, 16);
}

function Card({ s }: { s: Suggestion }) {
  return (
    <li className="rounded-xl border border-gray-800 bg-black/30 p-5">
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
        <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-purple-300">
          {s.kind === "edit" ? s.principle_id : "new principle"}
        </span>
        <span>{s.author_github_login ?? "email sign-up"}</span>
        <span>{when(s.created_at)}</span>
        {s.status === "approved" && (
          <span className="font-mono">{s.vote_count} votes</span>
        )}
      </div>

      {s.original_text && (
        <blockquote className="mb-3 border-l-2 border-gray-700 pl-3 text-sm italic leading-relaxed text-gray-600">
          {s.original_text}
        </blockquote>
      )}

      <p className="text-lg leading-relaxed text-gray-100">{s.proposed_text}</p>

      {s.rationale && (
        <p className="mt-2 text-sm leading-relaxed text-gray-500">{s.rationale}</p>
      )}

      <ModerationButtons id={s.id} status={s.status} />
    </li>
  );
}

function Section({
  title,
  blurb,
  rows,
}: {
  title: string;
  blurb: string;
  rows: Suggestion[];
}) {
  if (rows.length === 0) return null;
  return (
    <section className="mb-14">
      <h2 className="text-lg font-semibold text-gray-100">{title}</h2>
      <p className="mb-5 mt-1 text-sm leading-relaxed text-gray-600">{blurb}</p>
      <ul className="space-y-5">
        {rows.map((s) => (
          <Card key={s.id} s={s} />
        ))}
      </ul>
    </section>
  );
}

export default async function AdminPage() {
  const admin = await requireAdmin();
  // 404 rather than 403: an unauthorised visitor learns nothing about whether
  // this route exists.
  if (!admin) notFound();

  const db = createAdminClient();
  if (!db) notFound();

  const { data } = await db
    .from("suggestions")
    .select("*")
    .order("created_at", { ascending: true });

  const all = (data ?? []) as Suggestion[];
  const pending = all.filter((s) => s.status === "pending");
  const approved = all.filter((s) => s.status === "approved");
  const rejected = all.filter((s) => s.status === "rejected");

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-16">
      <header className="mb-12">
        <h1 className="text-2xl font-bold tracking-tight text-gray-100">
          Moderation
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-500">
          Approving publishes the <em>suggestion</em>, so other readers can see and
          vote on it. It does not change the manifesto — the principles live in{" "}
          <code className="text-gray-400">components/ui/manifesto-hero.tsx</code>,
          and adopting a wording still means a commit.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          Nothing here is one-way. <strong className="text-gray-400">Unapprove</strong>{" "}
          returns a suggestion to the queue and keeps its votes.{" "}
          <strong className="text-gray-400">Reject</strong> hides it from everyone
          but its author. <strong className="text-gray-400">Delete</strong> is
          permanent and takes its votes with it.
        </p>
      </header>

      {all.length === 0 && (
        <p className="rounded-xl border border-gray-800 bg-black/30 p-6 text-gray-500">
          Nothing yet.{" "}
          <Link href="/" className="text-purple-400 hover:underline">
            Back to the manifesto
          </Link>
          .
        </p>
      )}

      <Section
        title="Awaiting review"
        blurb="Visible only to the person who wrote it, until you approve."
        rows={pending}
      />
      <Section
        title="Published"
        blurb="Live on the manifesto right now, and open to votes."
        rows={approved}
      />
      <Section
        title="Rejected"
        blurb="Hidden from readers. Its author can still see it. Delete to remove it entirely."
        rows={rejected}
      />
    </main>
  );
}
