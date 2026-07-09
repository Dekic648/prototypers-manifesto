-- Suggestions + voting for the Prototyper's Manifesto.
--
-- Run this in the Supabase SQL editor (or `supabase db push`) after creating
-- the project. See docs/IMPROVEMENT_PLAN.md for the reasoning behind the shape
-- of this schema, and for the RLS tests that MUST pass before the write path
-- ships publicly.
--
-- The entire approve-first moderation model rests on the SELECT policy below.
-- If it is wrong, unmoderated text renders on the live site.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type suggestion_kind   as enum ('edit', 'new_principle');
create type suggestion_status as enum ('pending', 'approved', 'rejected');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- One table, discriminated by `kind`, rather than two.
--
-- Edit-suggestions and new-principle proposals share author, status, rationale,
-- vote_count, timestamps, every RLS policy, and the realtime channel. Splitting
-- them would duplicate all of that and force `votes` to carry a polymorphic
-- foreign key. The only asymmetry is that new-principle proposals have no
-- principle to attach to and no original text to snapshot; a CHECK constraint
-- keeps those columns honest.
create table public.suggestions (
  id            uuid primary key default gen_random_uuid(),
  kind          suggestion_kind   not null,
  status        suggestion_status not null default 'pending',

  -- Edit-only. References the immutable slug in the PRINCIPLES array in
  -- components/ui/manifesto-hero.tsx. Deliberately NOT a foreign key: the
  -- principles live in source control, not in this database.
  principle_id  text,

  -- Edit-only. The principle's exact wording when the suggestion was made, so
  -- a suggestion still reads sensibly after the principle itself is reworded.
  original_text text,

  proposed_text text not null,
  rationale     text,

  author_id           uuid not null references auth.users(id) on delete cascade,
  author_github_login text,
  author_avatar_url   text,

  -- Denormalized for read speed; maintained by the votes_sync_count trigger.
  -- Treat this column as the source of truth over optimistic client state.
  vote_count integer not null default 0,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  approved_at timestamptz,

  constraint edit_requires_principle check (
    (kind = 'edit' and principle_id is not null and original_text is not null)
    or
    (kind = 'new_principle' and principle_id is null)
  ),
  constraint proposed_text_len check (char_length(proposed_text) between 3 and 500),
  constraint rationale_len     check (rationale is null or char_length(rationale) <= 1000)
);

create index suggestions_principle_approved_idx
  on public.suggestions (principle_id, status) where status = 'approved';
create index suggestions_kind_approved_votes_idx
  on public.suggestions (kind, status, vote_count desc) where status = 'approved';
create index suggestions_author_idx on public.suggestions (author_id);

-- Upvotes only. The unique constraint is what makes one-vote-per-person true.
create table public.votes (
  id            uuid primary key default gen_random_uuid(),
  suggestion_id uuid not null references public.suggestions(id) on delete cascade,
  voter_id      uuid not null references auth.users(id) on delete cascade,
  created_at    timestamptz not null default now(),
  unique (suggestion_id, voter_id)
);

create index votes_suggestion_idx on public.votes (suggestion_id);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create or replace function public.sync_vote_count() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'INSERT') then
    update public.suggestions
       set vote_count = vote_count + 1
     where id = new.suggestion_id;
  elsif (tg_op = 'DELETE') then
    -- Floor at zero: a drifted counter should never render as negative.
    update public.suggestions
       set vote_count = greatest(vote_count - 1, 0)
     where id = old.suggestion_id;
  end if;
  return null;
end $$;

create trigger votes_sync_count
  after insert or delete on public.votes
  for each row execute function public.sync_vote_count();

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger suggestions_touch
  before update on public.suggestions
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Rate limiting
-- ---------------------------------------------------------------------------

-- security definer so it can count the caller's own pending rows, which the
-- caller can see but other users cannot. Called from the INSERT policy.
create or replace function public.under_rate_limit(uid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select count(*) < 5
    from public.suggestions
   where author_id = uid
     and created_at > now() - interval '1 hour';
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.suggestions enable row level security;
alter table public.votes       enable row level security;

-- Everyone, including anonymous readers, sees approved suggestions.
-- Authors additionally see their own rows at any status, which is what powers
-- the "awaiting review" state. These two clauses and nothing else — a broader
-- policy here publishes unmoderated content.
create policy suggestions_select_public on public.suggestions
  for select using (
    status = 'approved'
    or author_id = auth.uid()
  );

-- You may insert only as yourself, only as pending, and only within the rate limit.
create policy suggestions_insert_auth on public.suggestions
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and status = 'pending'
    and approved_at is null
    and public.under_rate_limit(auth.uid())
  );

-- You may revise your own suggestion while it is still pending. The `with check`
-- re-asserts status = 'pending', so this policy can never be used to self-approve.
-- There is no policy anywhere that permits writing status = 'approved'; approval
-- happens only via the service role, which bypasses RLS.
create policy suggestions_update_own_pending on public.suggestions
  for update to authenticated
  using      (author_id = auth.uid() and status = 'pending')
  with check (author_id = auth.uid() and status = 'pending');

-- Vote rows carry no secrets and counts are public.
create policy votes_select on public.votes
  for select using (true);

-- Vote as yourself, and only on a suggestion that is actually public.
create policy votes_insert_own on public.votes
  for insert to authenticated
  with check (
    voter_id = auth.uid()
    and exists (
      select 1 from public.suggestions s
       where s.id = suggestion_id and s.status = 'approved'
    )
  );

create policy votes_delete_own on public.votes
  for delete to authenticated
  using (voter_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

-- Realtime respects RLS, so anonymous subscribers receive only approved rows.
alter publication supabase_realtime add table public.suggestions;
alter publication supabase_realtime add table public.votes;
