/**
 * Can an ordinary signed-in user tamper with columns the policies don't mention?
 * Creates a throwaway user, probes, and deletes everything.
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

const report = (name, blocked, detail) =>
  console.log(`  ${blocked ? "blocked " : "ALLOWED "} ${name}${detail ? `  (${detail})` : ""}`);

const email = `tamper-${crypto.randomUUID().slice(0, 8)}@example.com`;
const password = crypto.randomUUID() + "Aa1!";
let userId;

try {
  userId = (await (await fetch(`${U}/auth/v1/admin/users`, { method: "POST", headers: svcH, body: JSON.stringify({ email, password, email_confirm: true }) })).json()).id;
  const jwt = (await (await fetch(`${U}/auth/v1/token?grant_type=password`, { method: "POST", headers: anonH, body: JSON.stringify({ email, password }) })).json()).access_token;
  console.log(`throwaway user ${userId}\n`);

  // 1. Insert claiming a vote_count and someone else's identity.
  const ins = await fetch(`${U}/rest/v1/suggestions`, {
    method: "POST", headers: { ...userH(jwt), Prefer: "return=representation" },
    body: JSON.stringify({
      kind: "new_principle",
      proposed_text: "TAMPER PROBE — delete me",
      author_id: userId,
      vote_count: 9999,
      author_github_login: "torvalds",
      author_avatar_url: "https://avatars.githubusercontent.com/u/1024025",
    }),
  });
  const row = (await ins.json())[0];
  if (ins.status !== 201) { console.log("  insert rejected outright:", ins.status); }
  else {
    report("insert with vote_count = 9999", row.vote_count !== 9999, `stored vote_count=${row.vote_count}`);
    report("insert impersonating @torvalds", row.author_github_login !== "torvalds", `stored login=${row.author_github_login}`);
  }

  if (row?.id) {
    // 2. Update vote_count on my own pending row.
    const up = await fetch(`${U}/rest/v1/suggestions?id=eq.${row.id}`, {
      method: "PATCH", headers: { ...userH(jwt), Prefer: "return=representation" },
      body: JSON.stringify({ vote_count: 5000 }),
    });
    const after = (await up.json())[0];
    report("UPDATE my pending row's vote_count to 5000", !(up.status === 200 && after?.vote_count === 5000), `http ${up.status}, vote_count=${after?.vote_count ?? "?"}`);

    // 3. Change my own row's kind / principle after the fact.
    const up2 = await fetch(`${U}/rest/v1/suggestions?id=eq.${row.id}`, {
      method: "PATCH", headers: { ...userH(jwt), Prefer: "return=representation" },
      body: JSON.stringify({ author_github_login: "torvalds" }),
    });
    const after2 = (await up2.json())[0];
    report("UPDATE my own author_github_login to @torvalds", after2?.author_github_login !== "torvalds", `login=${after2?.author_github_login ?? "?"}`);
  }

  // 4. Can anyone read the whole votes table (who voted for what)?
  const v = await fetch(`${U}/rest/v1/votes?select=suggestion_id,voter_id`, { headers: anonH });
  const votes = await v.json();
  report("anon SELECT * FROM votes (who voted for what)", !(Array.isArray(votes) && votes.length > 0), `anon sees ${Array.isArray(votes) ? votes.length : "?"} vote row(s)`);
} finally {
  if (userId) await fetch(`${U}/auth/v1/admin/users/${userId}`, { method: "DELETE", headers: svcH });
  const left = await (await fetch(`${U}/rest/v1/suggestions?select=id,proposed_text`, { headers: svcH })).json();
  const probes = left.filter(r => r.proposed_text?.startsWith("TAMPER PROBE"));
  for (const p of probes) await fetch(`${U}/rest/v1/suggestions?id=eq.${p.id}`, { method: "DELETE", headers: svcH });
  console.log(`\ncleanup: user deleted, ${probes.length} probe row(s) removed`);
}
