/**
 * Does Realtime actually deliver, and does it honour RLS?
 *
 * Subscribes with the ANON key, then uses the service role to flip a row
 * pending -> approved -> pending. An anonymous subscriber must be told when the
 * row becomes visible. Restores the original status.
 */
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n").filter(l => l.includes("=") && !l.startsWith("#"))
    .map(l => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")]; })
);
const U = env.NEXT_PUBLIC_SUPABASE_URL, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY, SVC = env.SUPABASE_SERVICE_ROLE_KEY;

const anon = createClient(U, ANON);
const svc = createClient(U, SVC, { auth: { persistSession: false } });

const events = [];
let subscribed = false;

const channel = anon
  .channel("test-manifesto-suggestions")
  .on("postgres_changes", { event: "*", schema: "public", table: "suggestions" }, (p) => {
    events.push({ type: p.eventType, status: p.new?.status ?? p.old?.status });
    console.log(`  << event received: ${p.eventType}  status=${p.new?.status ?? "?"}`);
  })
  .subscribe((status) => {
    console.log(`  channel status: ${status}`);
    if (status === "SUBSCRIBED") subscribed = true;
  });

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

await sleep(3000);
if (!subscribed) { console.log("\nFAIL: never subscribed. Is the table in the supabase_realtime publication?"); process.exit(1); }

// Find the pending row and publish it.
const { data: rows } = await svc.from("suggestions").select("id,status").eq("status", "pending").limit(1);
if (!rows?.length) { console.log("\nno pending row to toggle; skipping"); process.exit(0); }
const id = rows[0].id;

console.log(`\napproving ${id.slice(0, 8)} with the service role...`);
await svc.from("suggestions").update({ status: "approved", approved_at: new Date().toISOString() }).eq("id", id);
await sleep(2500);

const gotApprove = events.some(e => e.status === "approved");
console.log(`\n  ${gotApprove ? "PASS" : "FAIL"}  anonymous subscriber was told when the row became approved`);

console.log(`\nrestoring ${id.slice(0, 8)} to pending...`);
await svc.from("suggestions").update({ status: "pending", approved_at: null }).eq("id", id);
await sleep(2000);

const { data: after } = await svc.from("suggestions").select("status").eq("id", id).single();
console.log(`  restored status: ${after.status}`);
console.log(`\ntotal events seen by the anon subscriber: ${events.length}`);

await anon.removeChannel(channel);
process.exit(gotApprove ? 0 : 1);
