-- Close four holes found by scripts/tamper-test.mjs.
--
-- RLS answers "which ROWS may you touch". It says nothing about which COLUMNS.
-- So a signed-in user could insert a suggestion claiming vote_count = 9999 and
-- author_github_login = 'torvalds', wait for it to be approved, and top the
-- list under someone else's name. Verified against the live database.
--
-- The fix is column privileges, not policies. Note that they are enforced
-- against the *invoking* role, so:
--   * sync_vote_count() is SECURITY DEFINER and still updates vote_count;
--   * service_role (the /admin page) keeps every privilege and can moderate.

-- ---------------------------------------------------------------------------
-- suggestions: clients may write the words, and nothing else
-- ---------------------------------------------------------------------------

revoke insert, update on public.suggestions from anon, authenticated;

-- Enough to satisfy the edit_requires_principle CHECK and the insert policy.
-- Notably absent: status, vote_count, approved_at, author_github_login,
-- author_avatar_url. Those are set by the trigger below.
grant insert (kind, principle_id, original_text, proposed_text, rationale, author_id)
  on public.suggestions to authenticated;

-- An author revises their wording. They do not revise their vote count, their
-- identity, or which principle the suggestion was attached to.
grant update (proposed_text, rationale)
  on public.suggestions to authenticated;

-- Identity comes from the verified JWT, never from the request body.
-- INSERT only: a BEFORE UPDATE trigger here would fight sync_vote_count(),
-- which legitimately updates vote_count from inside the same transaction.
create or replace function public.set_suggestion_identity()
returns trigger language plpgsql security invoker set search_path = public as $$
declare
  meta jsonb := coalesce(auth.jwt() -> 'user_metadata', '{}'::jsonb);
begin
  new.status      := 'pending';
  new.approved_at := null;
  new.vote_count  := 0;

  -- Both are null for email sign-ups. Every render site has a fallback.
  new.author_github_login :=
    nullif(coalesce(meta ->> 'user_name', meta ->> 'preferred_username'), '');
  new.author_avatar_url := nullif(meta ->> 'avatar_url', '');

  return new;
end $$;

drop trigger if exists suggestions_set_identity on public.suggestions;
create trigger suggestions_set_identity
  before insert on public.suggestions
  for each row execute function public.set_suggestion_identity();

-- ---------------------------------------------------------------------------
-- votes: a ballot is secret
-- ---------------------------------------------------------------------------

-- `using (true)` let anyone with the anon key read every (suggestion, voter)
-- pair — who upvoted what, for the whole site. Nothing needs that. Totals come
-- from suggestions.vote_count; the client only needs to know its own votes so
-- it can render the button pressed.
drop policy if exists votes_select on public.votes;

create policy votes_select_own on public.votes
  for select to authenticated
  using (voter_id = auth.uid());

revoke insert, update on public.votes from anon, authenticated;
grant insert (suggestion_id, voter_id) on public.votes to authenticated;
-- No UPDATE grant at all: a vote is inserted or deleted, never edited.
