/**
 * RLS leak test — the blocking gate before the write path ships.
 *
 * Creates a throwaway user, inserts a PENDING suggestion as that user, and
 * proves the anonymous key cannot see it. Then tries every way a client might
 * escalate. Deletes everything at the end (deleting the user cascades).
 */
import fs from "node:fs";
import crypto from "node:crypto";

const env = Object.fromEntries(
  fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n").filter(l => l.includes("=") && !l.startsWith("#"))
    .map(l => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")]; })
);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SVC  = env.SUPABASE_SERVICE_ROLE_KEY;

const results = [];
const check = (name, pass, detail = "") => {
  results.push({ name, pass });
  console.log(`${pass ? "  PASS" : "  FAIL"}  ${name}${detail ? `\n          ${detail}` : ""}`);
};

const anonH = { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" };
const svcH  = { apikey: SVC,  Authorization: `Bearer ${SVC}`,  "Content-Type": "application/json" };
const userH = (jwt) => ({ apikey: ANON, Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" });

const email = `rls-leak-test-${crypto.randomUUID().slice(0, 8)}@example.com`;
const password = crypto.randomUUID() + "Aa1!";
let userId, jwt, suggestionId;

try {
  // --- setup: throwaway confirmed user -------------------------------------
  const mk = await fetch(`${URL_}/auth/v1/admin/users`, {
    method: "POST", headers: svcH,
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  const user = await mk.json();
  userId = user.id;
  if (!userId) { console.error("could not create test user:", user); process.exit(1); }
  console.log(`setup: created throwaway user ${userId}\n`);

  const tk = await fetch(`${URL_}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: anonH, body: JSON.stringify({ email, password }),
  });
  jwt = (await tk.json()).access_token;
  if (!jwt) { console.error("could not get session"); process.exit(1); }

  // --- 1. author can insert a pending suggestion ---------------------------
  const ins = await fetch(`${URL_}/rest/v1/suggestions`, {
    method: "POST", headers: { ...userH(jwt), Prefer: "return=representation" },
    body: JSON.stringify({
      kind: "edit",
      principle_id: "answer-to-a-question",
      original_text: "A prototype is an answer to a question. No question, no prototype.",
      proposed_text: "LEAK TEST — this row must never be visible to anonymous readers.",
      author_id: userId,
    }),
  });
  const insBody = await ins.json();
  suggestionId = Array.isArray(insBody) ? insBody[0]?.id : undefined;
  check("author can insert a pending suggestion", ins.status === 201 && !!suggestionId,
        ins.status !== 201 ? JSON.stringify(insBody) : `status=${insBody[0]?.status}`);

  // --- 2. THE LEAK TEST ----------------------------------------------------
  const anonSel = await fetch(`${URL_}/rest/v1/suggestions?select=id,status,proposed_text`, { headers: anonH });
  const anonRows = await anonSel.json();
  const leaked = Array.isArray(anonRows) && anonRows.some(r => r.id === suggestionId);
  check("anon CANNOT see the pending suggestion  <-- the gate", !leaked,
        leaked ? "!!! PENDING ROW IS PUBLIC !!!" : `anon sees ${anonRows.length} row(s)`);

  // --- 3. author CAN see their own pending row -----------------------------
  const mineSel = await fetch(`${URL_}/rest/v1/suggestions?select=id,status`, { headers: userH(jwt) });
  const mineRows = await mineSel.json();
  check("author CAN see their own pending row ('awaiting review')",
        Array.isArray(mineRows) && mineRows.some(r => r.id === suggestionId));

  // --- 4. author cannot self-approve ---------------------------------------
  const appr = await fetch(`${URL_}/rest/v1/suggestions?id=eq.${suggestionId}`, {
    method: "PATCH", headers: { ...userH(jwt), Prefer: "return=representation" },
    body: JSON.stringify({ status: "approved" }),
  });
  const apprBody = await appr.json();
  const approved = appr.status === 200 && Array.isArray(apprBody) && apprBody.length > 0;
  check("author CANNOT self-approve", !approved, approved ? "!!! SELF-APPROVAL WORKED !!!" : `http ${appr.status}`);

  // --- 5. cannot insert pre-approved ---------------------------------------
  const preAppr = await fetch(`${URL_}/rest/v1/suggestions`, {
    method: "POST", headers: userH(jwt),
    body: JSON.stringify({ kind: "new_principle", proposed_text: "pre-approved attempt", author_id: userId, status: "approved" }),
  });
  check("CANNOT insert a row that is already approved", preAppr.status !== 201, `http ${preAppr.status}`);

  // --- 6. cannot insert as someone else ------------------------------------
  const spoof = await fetch(`${URL_}/rest/v1/suggestions`, {
    method: "POST", headers: userH(jwt),
    body: JSON.stringify({ kind: "new_principle", proposed_text: "spoofed author", author_id: crypto.randomUUID() }),
  });
  check("CANNOT insert with someone else's author_id", spoof.status !== 201, `http ${spoof.status}`);

  // --- 7. cannot vote on a non-approved suggestion -------------------------
  const badVote = await fetch(`${URL_}/rest/v1/votes`, {
    method: "POST", headers: userH(jwt),
    body: JSON.stringify({ suggestion_id: suggestionId, voter_id: userId }),
  });
  check("CANNOT vote on a pending suggestion", badVote.status !== 201, `http ${badVote.status}`);

  // --- 8. rate limit: 5/hour ----------------------------------------------
  let lastStatus = 0;
  for (let i = 0; i < 5; i++) {
    const r = await fetch(`${URL_}/rest/v1/suggestions`, {
      method: "POST", headers: userH(jwt),
      body: JSON.stringify({ kind: "new_principle", proposed_text: `rate limit probe ${i}`, author_id: userId }),
    });
    lastStatus = r.status;
  }
  check("rate limit blocks the 6th suggestion in an hour", lastStatus !== 201, `last insert http ${lastStatus}`);

} finally {
  // --- cleanup: deleting the user cascades to suggestions + votes ----------
  if (userId) {
    const del = await fetch(`${URL_}/auth/v1/admin/users/${userId}`, { method: "DELETE", headers: svcH });
    console.log(`\ncleanup: deleted throwaway user -> http ${del.status}`);
  }
  const left = await fetch(`${URL_}/rest/v1/suggestions?select=id`, { headers: svcH });
  const leftRows = await left.json();
  console.log(`cleanup: suggestions remaining in table: ${Array.isArray(leftRows) ? leftRows.length : "?"}`);

  const failed = results.filter(r => !r.pass);
  console.log(`\n${failed.length === 0 ? "ALL PASS" : `${failed.length} FAILED`} (${results.length} checks)`);
  if (failed.length) process.exitCode = 1;
}
