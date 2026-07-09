/**
 * Voting integrity. Seeds its own approved suggestion and a throwaway voter,
 * exercises the trigger, the unique constraint and every vote policy, then
 * deletes both. Touches nothing that already existed.
 *
 * The load-bearing check is the first one: `authenticated` has no column
 * privilege on vote_count, yet sync_vote_count() must still move it. That works
 * only because the trigger is SECURITY DEFINER. If someone "tidies" that away,
 * this test goes red.
 */
import crypto from "node:crypto";
import {
  URL_, anonH, userH, svcH, check, summary,
  makeUser, deleteUser, seedSuggestion, deleteSuggestion, voteCount,
} from "./_harness.mjs";

const castVote = (suggestionId, voterId, jwt) =>
  fetch(`${URL_}/rest/v1/votes`, {
    method: "POST",
    headers: jwt ? userH(jwt) : anonH,
    body: JSON.stringify({ suggestion_id: suggestionId, voter_id: voterId }),
  });

let voter, approved, pending;

try {
  voter = await makeUser("voter");
  approved = await seedSuggestion(voter.id, { approved: true, text: "VOTE FIXTURE — approved" });
  pending = await seedSuggestion(voter.id, { approved: false, text: "VOTE FIXTURE — pending" });
  console.log(`fixtures seeded, voter ${voter.id}\n`);

  const before = await voteCount(approved);

  const v1 = await castVote(approved, voter.id, voter.jwt);
  const after = await voteCount(approved);
  check("vote inserts and the SECURITY DEFINER trigger increments vote_count",
    v1.status === 201 && after === before + 1, `${before} -> ${after}`);

  const v2 = await castVote(approved, voter.id, voter.jwt);
  const b2 = await v2.json();
  check("a second vote from the same person is rejected",
    v2.status === 409 || b2.code === "23505", `http ${v2.status} code ${b2.code ?? "-"}`);

  const v3 = await castVote(pending, voter.id, voter.jwt);
  check("cannot vote on a pending suggestion", v3.status !== 201, `http ${v3.status}`);

  const v4 = await castVote(approved, crypto.randomUUID(), voter.jwt);
  check("cannot vote as another user", v4.status !== 201, `http ${v4.status}`);

  const v5 = await castVote(approved, voter.id, null);
  check("anonymous cannot vote", v5.status !== 201, `http ${v5.status}`);

  const del = await fetch(`${URL_}/rest/v1/votes?suggestion_id=eq.${approved}&voter_id=eq.${voter.id}`,
    { method: "DELETE", headers: userH(voter.jwt) });
  const back = await voteCount(approved);
  check("un-vote deletes and the trigger decrements",
    del.status === 204 && back === before, `${after} -> ${back}`);

  const rows = await (await fetch(`${URL_}/rest/v1/votes?suggestion_id=eq.${approved}&select=id`, { headers: svcH })).json();
  const final = await voteCount(approved);
  check("vote_count agrees with the votes table", final === rows.length, `vote_count=${final}, rows=${rows.length}`);
} finally {
  await deleteSuggestion(approved);
  await deleteSuggestion(pending);
  await deleteUser(voter?.id);
  console.log("\ncleanup: fixtures and throwaway voter deleted");
  summary();
}
