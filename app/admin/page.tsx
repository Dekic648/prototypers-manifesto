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
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  const pending = (data ?? []) as Suggestion[];

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-16">
      <header className="mb-10">
        <h1 className="text-2xl font-bold tracking-tight text-gray-100">
          Awaiting review
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-500">
          Approving publishes the <em>suggestion</em>, so other readers can see and
          vote on it. It does not change the manifesto — the principles live in{" "}
          <code className="text-gray-400">components/ui/manifesto-hero.tsx</code>,
          and adopting a wording still means a commit.
        </p>
      </header>

      {pending.length === 0 ? (
        <p className="rounded-xl border border-gray-800 bg-black/30 p-6 text-gray-500">
          Nothing waiting. <Link href="/" className="text-purple-400 hover:underline">Back to the manifesto</Link>.
        </p>
      ) : (
        <ul className="space-y-5">
          {pending.map((s) => (
            <li
              key={s.id}
              className="rounded-xl border border-gray-800 bg-black/30 p-5"
            >
              <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-purple-300">
                  {s.kind === "edit" ? s.principle_id : "new principle"}
                </span>
                <span>{s.author_github_login ?? "email sign-up"}</span>
                <span>{when(s.created_at)}</span>
              </div>

              {s.original_text && (
                <blockquote className="mb-3 border-l-2 border-gray-700 pl-3 text-sm italic leading-relaxed text-gray-600">
                  {s.original_text}
                </blockquote>
              )}

              <p className="text-lg leading-relaxed text-gray-100">
                {s.proposed_text}
              </p>

              {s.rationale && (
                <p className="mt-2 text-sm leading-relaxed text-gray-500">
                  {s.rationale}
                </p>
              )}

              <ModerationButtons id={s.id} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
