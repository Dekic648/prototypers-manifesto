-- Anonymous voting.
--
-- Supabase's signInAnonymously() mints a real row in auth.users with
-- is_anonymous = true. Such a user is granted the `authenticated` Postgres
-- role, exactly like a signed-in one. Every policy written `to authenticated`
-- therefore starts accepting anonymous users the moment the feature is enabled
-- in the dashboard. That cuts both ways.
--
-- For `votes` it is precisely what we want, and nothing here needs to change:
--   * `unique (suggestion_id, voter_id)` still makes one-vote-per-identity true
--   * the votes_sync_count trigger still maintains suggestions.vote_count
--   * votes_delete_own still lets someone take their vote back
-- The vote policies are deliberately left untouched below.
--
-- For `suggestions` it is precisely what we do NOT want: an anonymous user
-- could otherwise post unmoderated text with no identity attached to it, and
-- the per-author rate limit would be trivially resettable by clearing storage.
-- The two write policies are rewritten to demand a non-anonymous session.
--
-- Reading the claim: auth.jwt() ->> 'is_anonymous' yields text ('true'/'false'),
-- and is absent entirely from tokens minted before anonymous sign-ins were
-- turned on. A bare cast would return NULL for those, and `not NULL` is NULL —
-- which fails closed for legitimate users. Hence coalesce to false.

create or replace function public.is_anonymous_session() returns boolean
language sql stable as $$
  select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
$$;

comment on function public.is_anonymous_session() is
  'True when the caller signed in via signInAnonymously(). Used to keep '
  'anonymous users out of the suggestions table while still letting them vote.';

-- Recreated verbatim from 0001, with the anonymity check added.
drop policy if exists suggestions_insert_auth on public.suggestions;
create policy suggestions_insert_auth on public.suggestions
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and status = 'pending'
    and approved_at is null
    and not public.is_anonymous_session()
    and public.under_rate_limit(auth.uid())
  );

drop policy if exists suggestions_update_own_pending on public.suggestions;
create policy suggestions_update_own_pending on public.suggestions
  for update to authenticated
  using (
    author_id = auth.uid()
    and status = 'pending'
    and not public.is_anonymous_session()
  )
  with check (
    author_id = auth.uid()
    and status = 'pending'
    and not public.is_anonymous_session()
  );
