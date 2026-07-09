/**
 * Shared fixtures for the test scripts.
 *
 * Every suite seeds the rows it needs and deletes them afterwards. Depending on
 * whatever happens to be in the table means a suite goes quiet the moment a
 * maintainer approves or rejects something — which is precisely when you want it
 * to speak up.
 */
import fs from "node:fs";
import crypto from "node:crypto";

const env = Object.fromEntries(
  fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n").filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")]; }),
);

export const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
export const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const SVC = env.SUPABASE_SERVICE_ROLE_KEY;

export const anonH = { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" };
export const svcH = { apikey: SVC, Authorization: `Bearer ${SVC}`, "Content-Type": "application/json" };
export const userH = (jwt) => ({ apikey: ANON, Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" });

const results = [];
export function check(name, pass, detail = "") {
  results.push(pass);
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
}
export function summary() {
  const failed = results.filter((r) => !r).length;
  console.log(`\n${failed === 0 ? "ALL PASS" : `${failed} FAILED`} (${results.length} checks)`);
  if (failed) process.exitCode = 1;
}

/** A confirmed throwaway user, plus a real access token for it. */
export async function makeUser(prefix) {
  const email = `${prefix}-${crypto.randomUUID().slice(0, 8)}@example.com`;
  const password = crypto.randomUUID() + "Aa1!";
  const created = await (await fetch(`${URL_}/auth/v1/admin/users`, {
    method: "POST", headers: svcH, body: JSON.stringify({ email, password, email_confirm: true }),
  })).json();
  if (!created.id) throw new Error("could not create user: " + JSON.stringify(created));

  const tok = await (await fetch(`${URL_}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: anonH, body: JSON.stringify({ email, password }),
  })).json();
  if (!tok.access_token) throw new Error("could not sign in as the test user");

  return { id: created.id, jwt: tok.access_token };
}

export async function deleteUser(id) {
  if (id) await fetch(`${URL_}/auth/v1/admin/users/${id}`, { method: "DELETE", headers: svcH });
}

/** Seed a suggestion with the service role. Optionally publish it. */
export async function seedSuggestion(authorId, { approved = false, text = "TEST FIXTURE — safe to delete" } = {}) {
  const res = await fetch(`${URL_}/rest/v1/suggestions`, {
    method: "POST", headers: { ...svcH, Prefer: "return=representation" },
    body: JSON.stringify({ kind: "new_principle", proposed_text: text, author_id: authorId }),
  });
  const row = (await res.json())[0];
  if (!row?.id) throw new Error("could not seed suggestion: " + JSON.stringify(row));

  if (approved) {
    await fetch(`${URL_}/rest/v1/suggestions?id=eq.${row.id}`, {
      method: "PATCH", headers: svcH,
      body: JSON.stringify({ status: "approved", approved_at: new Date().toISOString() }),
    });
  }
  return row.id;
}

/** Cascades to votes. */
export async function deleteSuggestion(id) {
  if (id) await fetch(`${URL_}/rest/v1/suggestions?id=eq.${id}`, { method: "DELETE", headers: svcH });
}

export async function voteCount(id) {
  const rows = await (await fetch(`${URL_}/rest/v1/suggestions?id=eq.${id}&select=vote_count`, { headers: svcH })).json();
  return rows[0]?.vote_count;
}
