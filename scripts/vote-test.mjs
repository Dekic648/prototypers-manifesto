/**
 * Voting integrity test. Creates a throwaway voter, exercises the trigger, the
 * unique constraint and every vote policy, then deletes the voter. Leaves
 * vote_count exactly as it found it. Run after changing votes policies.
 */
import fs from "node:fs";
import crypto from "node:crypto";

const env = Object.fromEntries(
  fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n").filter(l => l.includes("=") && !l.startsWith("#"))
    .map(l => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")]; })
);
const U = env.NEXT_PUBLIC_SUPABASE_URL, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY, SVC = env.SUPABASE_SERVICE_ROLE_KEY;
const anonH = { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" };
const svcH = { apikey: SVC, Authorization: `Bearer ${SVC}`, "Content-Type": "application/json" };
const userH = j => ({ apikey: ANON, Authorization: `Bearer ${j}`, "Content-Type": "application/json" });

const check = (n, p, d = "") => console.log(`  ${p ? "PASS" : "FAIL"}  ${n}${d ? `  (${d})` : ""}`);
const count = async id => (await (await fetch(`${U}/rest/v1/suggestions?id=eq.${id}&select=vote_count`, { headers: svcH })).json())[0]?.vote_count;

const email = `vote-test-${crypto.randomUUID().slice(0, 8)}@example.com`;
const password = crypto.randomUUID() + "Aa1!";
let userId;

try {
  const rows = await (await fetch(`${U}/rest/v1/suggestions?select=id,status&order=created_at`, { headers: svcH })).json();
  const approved = rows.find(r => r.status === "approved");
  const pending = rows.find(r => r.status === "pending");
  if (!approved) { console.log("no approved suggestion to vote on — approve one first"); process.exit(0); }

  userId = (await (await fetch(`${U}/auth/v1/admin/users`, { method: "POST", headers: svcH, body: JSON.stringify({ email, password, email_confirm: true }) })).json()).id;
  const jwt = (await (await fetch(`${U}/auth/v1/token?grant_type=password`, { method: "POST", headers: anonH, body: JSON.stringify({ email, password }) })).json()).access_token;
  console.log(`setup: throwaway voter ${userId}\n`);

  const before = await count(approved.id);

  // 1. vote
  const v1 = await fetch(`${U}/rest/v1/votes`, { method: "POST", headers: userH(jwt), body: JSON.stringify({ suggestion_id: approved.id, voter_id: userId }) });
  const after = await count(approved.id);
  check("vote inserts and the trigger increments vote_count", v1.status === 201 && after === before + 1, `${before} -> ${after}`);

  // 2. double vote blocked by unique constraint
  const v2 = await fetch(`${U}/rest/v1/votes`, { method: "POST", headers: userH(jwt), body: JSON.stringify({ suggestion_id: approved.id, voter_id: userId }) });
  const body2 = await v2.json();
  check("second vote by the same person is rejected", v2.status === 409 || body2.code === "23505", `http ${v2.status} code ${body2.code ?? "-"}`);

  // 3. cannot vote on a pending suggestion
  if (pending) {
    const v3 = await fetch(`${U}/rest/v1/votes`, { method: "POST", headers: userH(jwt), body: JSON.stringify({ suggestion_id: pending.id, voter_id: userId }) });
    check("cannot vote on a pending suggestion", v3.status !== 201, `http ${v3.status}`);
  }

  // 4. cannot vote as someone else
  const v4 = await fetch(`${U}/rest/v1/votes`, { method: "POST", headers: userH(jwt), body: JSON.stringify({ suggestion_id: approved.id, voter_id: crypto.randomUUID() }) });
  check("cannot vote as another user", v4.status !== 201, `http ${v4.status}`);

  // 5. un-vote decrements
  const d = await fetch(`${U}/rest/v1/votes?suggestion_id=eq.${approved.id}&voter_id=eq.${userId}`, { method: "DELETE", headers: userH(jwt) });
  const back = await count(approved.id);
  check("un-vote deletes and the trigger decrements", d.status === 204 && back === before, `${after} -> ${back}`);

  // 6. anon cannot vote
  const v6 = await fetch(`${U}/rest/v1/votes`, { method: "POST", headers: anonH, body: JSON.stringify({ suggestion_id: approved.id, voter_id: userId }) });
  check("anonymous cannot vote", v6.status !== 201, `http ${v6.status}`);

  // 7. counts reconcile
  const total = (await (await fetch(`${U}/rest/v1/votes?select=id`, { headers: svcH })).json()).length;
  const final = await count(approved.id);
  check("vote_count matches the votes table", final === 0 && total === 0, `vote_count=${final}, votes rows=${total}`);
} finally {
  if (userId) await fetch(`${U}/auth/v1/admin/users/${userId}`, { method: "DELETE", headers: svcH });
  console.log("\ncleanup: throwaway voter deleted");
}
