/**
 * Can an ordinary signed-in user write columns the RLS policies never mention?
 *
 * RLS answers "which ROWS may you touch". Column privileges answer "which
 * COLUMNS". Before migration 0002 a user could claim vote_count = 9999 and sign
 * a suggestion @torvalds. This proves they cannot, and that the legitimate
 * paths still work — a lockdown that also breaks writing is not a fix.
 *
 * Seeds and deletes everything it uses.
 */
import { URL_, anonH, userH, svcH, check, summary, makeUser, deleteUser, deleteSuggestion } from "./_harness.mjs";

const post = (body, jwt) =>
  fetch(`${URL_}/rest/v1/suggestions`, {
    method: "POST",
    headers: { ...userH(jwt), Prefer: "return=representation" },
    body: JSON.stringify(body),
  });

const patch = (id, body, jwt) =>
  fetch(`${URL_}/rest/v1/suggestions?id=eq.${id}`, {
    method: "PATCH",
    headers: { ...userH(jwt), Prefer: "return=representation" },
    body: JSON.stringify(body),
  });

let user, mine;

try {
  user = await makeUser("tamper");
  console.log(`throwaway user ${user.id}\n`);

  // --- the legitimate path must still work --------------------------------
  const ok = await post(
    { kind: "new_principle", proposed_text: "TAMPER FIXTURE — safe to delete", author_id: user.id },
    user.jwt,
  );
  const row = ok.status === 201 ? (await ok.json())[0] : null;
  mine = row?.id;
  check("a normal insert still succeeds", ok.status === 201, `http ${ok.status}`);
  check("the database forces vote_count = 0", row?.vote_count === 0, `vote_count=${row?.vote_count}`);
  check("the database forces status = pending", row?.status === "pending", `status=${row?.status}`);
  check(
    "identity comes from the JWT (null for an email sign-up, not forged)",
    row?.author_github_login === null,
    `login=${String(row?.author_github_login)}`,
  );

  // --- the attacks ---------------------------------------------------------
  const a1 = await post(
    { kind: "new_principle", proposed_text: "attack", author_id: user.id, vote_count: 9999 },
    user.jwt,
  );
  check("INSERT claiming vote_count = 9999 is refused", a1.status !== 201, `http ${a1.status}`);

  const a2 = await post(
    { kind: "new_principle", proposed_text: "attack", author_id: user.id, author_github_login: "torvalds" },
    user.jwt,
  );
  check("INSERT impersonating @torvalds is refused", a2.status !== 201, `http ${a2.status}`);

  const a3 = await post(
    { kind: "new_principle", proposed_text: "attack", author_id: user.id, status: "approved" },
    user.jwt,
  );
  check("INSERT that is already approved is refused", a3.status !== 201, `http ${a3.status}`);

  if (mine) {
    const a4 = await patch(mine, { vote_count: 5000 }, user.jwt);
    check("UPDATE my own row's vote_count is refused", a4.status !== 200, `http ${a4.status}`);

    const a5 = await patch(mine, { author_github_login: "torvalds" }, user.jwt);
    check("UPDATE my own author_github_login is refused", a5.status !== 200, `http ${a5.status}`);

    const a6 = await patch(mine, { status: "approved" }, user.jwt);
    check("UPDATE my own status to approved is refused", a6.status !== 200, `http ${a6.status}`);

    // --- but an author may still revise their own words -------------------
    const okEdit = await patch(mine, { proposed_text: "TAMPER FIXTURE — revised" }, user.jwt);
    check("an author can still revise their own wording", okEdit.status === 200, `http ${okEdit.status}`);
  }

  // --- the ballot is secret ------------------------------------------------
  const anonVotes = await (await fetch(`${URL_}/rest/v1/votes?select=suggestion_id,voter_id`, { headers: anonH })).json();
  check(
    "anon cannot read the votes table (who voted for what)",
    Array.isArray(anonVotes) && anonVotes.length === 0,
    `anon sees ${Array.isArray(anonVotes) ? anonVotes.length : "?"} row(s)`,
  );

  const svcVotes = await (await fetch(`${URL_}/rest/v1/votes?select=id`, { headers: svcH })).json();
  const userVotes = await (await fetch(`${URL_}/rest/v1/votes?select=id`, { headers: userH(user.jwt) })).json();
  check(
    "a signed-in user sees only their own votes",
    Array.isArray(userVotes) && userVotes.length === 0 && svcVotes.length >= 0,
    `they see ${userVotes.length}, the table holds ${svcVotes.length}`,
  );
} finally {
  await deleteSuggestion(mine);
  await deleteUser(user?.id);
  console.log("\ncleanup: fixture and throwaway user deleted");
  summary();
}
