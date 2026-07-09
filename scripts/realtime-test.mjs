/**
 * Does Realtime deliver, and does it honour RLS?
 *
 * Subscribes with the ANON key, seeds a pending suggestion, approves it with the
 * service role, then un-approves it. The anonymous subscriber must be told about
 * the approval — that is the moment the row becomes visible — and must NOT be
 * told about the creation or the un-approval, because at those moments it cannot
 * see the row at all.
 *
 * Seeds and deletes its own fixture.
 */
import { createClient } from "@supabase/supabase-js";
import {
  URL_, ANON, svcH, check, summary,
  makeUser, deleteUser, seedSuggestion, deleteSuggestion,
} from "./_harness.mjs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const anon = createClient(URL_, ANON);

const events = [];
let subscribed = false;

const channel = anon
  .channel("test-manifesto-suggestions")
  .on("postgres_changes", { event: "*", schema: "public", table: "suggestions" }, (p) => {
    events.push({ type: p.eventType, status: p.new?.status ?? null });
  })
  .subscribe((s) => { if (s === "SUBSCRIBED") subscribed = true; });

const setStatus = (id, status) =>
  fetch(`${URL_}/rest/v1/suggestions?id=eq.${id}`, {
    method: "PATCH",
    headers: svcH,
    body: JSON.stringify({
      status,
      approved_at: status === "approved" ? new Date().toISOString() : null,
    }),
  });

let author, fixture;

try {
  await sleep(3000);
  check("anonymous client can subscribe to the suggestions channel", subscribed);
  if (!subscribed) throw new Error("never subscribed — is the table in the supabase_realtime publication?");

  author = await makeUser("rt");
  fixture = await seedSuggestion(author.id, { text: "REALTIME FIXTURE — safe to delete" });
  await sleep(2000);

  const pendingEvents = events.filter((e) => e.status === "pending").length;
  check("anon is NOT told when a pending suggestion is created",
    pendingEvents === 0, `${pendingEvents} event(s)`);

  await setStatus(fixture, "approved");
  await sleep(2500);
  check("anon IS told the moment the row is approved",
    events.some((e) => e.status === "approved"), `${events.length} event(s) so far`);

  const before = events.length;
  await setStatus(fixture, "pending");
  await sleep(2500);
  check("anon is NOT told when the row is un-approved (it can no longer see it)",
    events.length === before, `${events.length - before} extra event(s)`);
} finally {
  await deleteSuggestion(fixture);
  await deleteUser(author?.id);
  await anon.removeChannel(channel);
  console.log("\ncleanup: fixture and throwaway user deleted");
  summary();
  // The realtime websocket keeps the event loop alive.
  process.exit(process.exitCode ?? 0);
}
