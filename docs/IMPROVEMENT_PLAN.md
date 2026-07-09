# Improvement plan: in-page suggestions and voting

## Why

Contributing to the manifesto currently means using GitHub — fork the repo, edit the
`PRINCIPLES` array, open a pull request. That is a real barrier for exactly the people this
manifesto is written for: designers and prototypers who have a sharp opinion about a sentence
and no appetite for a pull request.

The GitHub route stays. It just stops being the only route.

Two features, both on the live site:

1. **Highlight to suggest.** Select the text of a principle, get a floating "Suggest an edit"
   toolbar, propose a rewording. A small bubble beside each principle shows how many
   suggestions it has; clicking it opens a panel.
2. **Suggest a new principle.** An eleventh item at the end of the list: a form to propose a
   principle, and a list of proposals readers can upvote, sorted by votes.

This turns a static page into a stateful application. That is the real change. The interaction
design is the easy half.

## Decisions

| Question | Decision |
| --- | --- |
| Reading the manifesto | Anonymous. No friction, no sign-in, no cookie banner. |
| Suggesting or voting | Requires GitHub sign-in. |
| Moderation | Approve-first. Nothing is published until a maintainer approves it. |
| Real-time | Yes. Approvals and vote counts push to every open tab. |
| Backend | Supabase, provisioned through the Vercel Marketplace integration. |

**On the backend.** Vercel Postgres no longer exists as a product; Vercel migrated every store
to Neon during Q4 2024–Q1 2025, and storage is now provisioned from the Vercel Marketplace.
Supabase is a native Marketplace integration — created as a Vercel storage resource, billed
through Vercel, environment variables synced automatically, free tier identical to going direct.
It is the only option that supplies Postgres *and* GitHub OAuth *and* Realtime from a single
resource. Neon would supply the Postgres alone and leave authentication and real-time to be
built by hand.

**On approve-first plus real-time.** Read literally, these cancel out: if nothing publishes until
a maintainer approves it, there is nothing to push live, and the person who submitted a
suggestion watches it vanish. The resolution is that an author always sees their own pending
suggestion, labelled *awaiting review*. When it is approved, Realtime pushes it to every open
tab. Real-time makes approval feel immediate rather than making submission feel broken.

## Architecture

The load-bearing constraint: **`/` stays statically prerendered.** The manifesto text ships in
the initial HTML, the particle canvas paints immediately, and no database call sits in the
render path.

- **Static shell.** `app/page.tsx` and the `<ol>` of principles render exactly as they do today.
- **Client layer.** Everything backed by Supabase mounts after hydration, renders nothing until a
  `mounted` flag flips, and fetches from the browser client.

`ManifestoHero` remains a client component — it already is, for framer-motion. It must not become
async, and must never read Supabase during render.

### Stable IDs (prerequisite, shipped)

Principles used to be keyed by array index. Votes and suggestions need a durable anchor: key them
to a position and the first reorder silently moves every suggestion onto the wrong principle.

Each principle now carries an `id` slug. The visible `01`…`10` badge stays derived from array
order. The slug is used only as a database key and as the `data-principle-id` attribute.

**Reordering the array is safe. Renaming a slug is not** — it orphans every suggestion attached
to it. Treat slugs as immutable once shipped. If a rename is genuinely unavoidable, migrate the
data: `update suggestions set principle_id = 'new' where principle_id = 'old';`

### Database

See [`supabase/migrations/0001_suggestions.sql`](../supabase/migrations/0001_suggestions.sql) for
the schema, the triggers, the rate limit, and the row-level security policies, each with the
reasoning inline.

The shape in brief: one `suggestions` table discriminated by `kind` (`edit` | `new_principle`)
rather than two tables, because the two kinds share every column that matters, every RLS policy,
and the realtime channel — and splitting them would force a polymorphic foreign key on `votes`.
A `votes` table with `unique (suggestion_id, voter_id)` is what makes one-vote-per-person true.
`vote_count` is denormalized onto `suggestions` and maintained by a trigger.

Approve-first is enforced entirely in the database. No policy permits a client to write
`status = 'approved'`; the only UPDATE policy re-asserts `status = 'pending'` in its `with check`.
Approval happens exclusively through the service role, which bypasses RLS.

## Files

**Modified**

- `components/ui/manifesto-hero.tsx` — slugs and `data-principle-id` (done); later, mount the
  suggestion layer and the eleventh card.
- `app/layout.tsx` — mount the auth menu. Keep `suppressHydrationWarning` scoped to `<body>`.
- `app/page.tsx` — **guardrail. Must remain a static server component.**

**New — infrastructure**

- `lib/supabase/{client,server,session}.ts` — `@supabase/ssr` factories. Both clients return `null`
  when Supabase is unconfigured, so a fresh clone without `.env.local` still renders the manifesto.
- `proxy.ts` — refreshes the auth cookie. **Next 16 renamed the `middleware` file convention to
  `proxy`**, and the exported function renames with it; Supabase's docs still show the old name.
  Confirmed it does not de-opt `/` into dynamic rendering.
- `app/auth/callback/route.ts` — exchanges the OAuth code for a session.
- `lib/types.ts`, `lib/suggestions.ts` — types mirroring the schema; the data-access helpers.

**New — state**

- `components/suggestions/suggestions-provider.tsx` — context. Fetches after mount and hosts the
  single Realtime channel for the whole page.
- `hooks/use-text-selection.ts` — maps a DOM `Selection` to a principle by walking
  `range.commonAncestorContainer` up to the nearest `[data-principle-id]`.

**New — interface**

- `selection-toolbar.tsx`, `suggest-edit-dialog.tsx`, `principle-bubble.tsx`,
  `suggestions-panel.tsx`, `suggest-new-principle-card.tsx`, `vote-button.tsx`,
  `components/auth/auth-menu.tsx`.

Primitives: `npx shadcn@latest add dialog sheet button textarea popover tooltip sonner`. These
are the first Radix packages in the repo; `components.json` is already configured for them.

## Accessibility

Highlight-to-suggest is mouse-centric and behaves badly on touch. **The floating toolbar is an
enhancement, never the only path.** Every principle also gets a ghost pencil button — revealed on
hover and focus, permanently visible under `pointer: coarse` — which opens the same dialog with
the whole principle as its original text. Text selection is sugar on top of a button that always
works.

Bubbles and vote buttons are real `<button>` elements in tab order. Radix supplies focus trapping,
`Esc`, and return-focus for the dialog and panel. The vote button carries `aria-pressed`; the
proposal list is an `aria-live="polite"` region so that real-time insertions are announced; new
animation respects `prefers-reduced-motion`, as the particle field already does.

## Moderation

Go to [`/admin`](../app/admin/page.tsx). It lists everything pending with Approve and Reject buttons.
Visible only to the GitHub logins in `ADMIN_GITHUB_LOGINS`, which defaults to the repository owner.
Anyone else gets a `404` — not a `403` — so an unauthorised visitor learns nothing about the route.

**Approving publishes the suggestion, not the principle.** An approved suggestion becomes visible to
other readers and, from Phase 4, votable. The manifesto's own wording lives in
`components/ui/manifesto-hero.tsx` and only changes with a commit. That separation is the point: a
proposal can be discussed and ranked without anyone touching the text.

Two things hold this together, and both are easy to get wrong:

- **A Server Action is a public HTTP endpoint.** Gating the *page* behind an admin check protects
  the page and nothing else — anyone who learns an action's id can POST to it directly. So
  `approveSuggestion` and `rejectSuggestion` each call `requireAdmin()` again before touching the
  database. Verify this on every new action.
- **`lib/supabase/admin.ts` starts with `import "server-only"`**, so pulling the service-role client
  into a client component fails the build instead of shipping the key to browsers. Confirmed absent
  from `.next/static`. Note that the anon and service-role JWTs share a 110-character prefix, so a
  short grep for one will match the other — always check against the full key.

### Notification, and why the issue carries no text

Approve-first makes the maintainer a bottleneck, and a queue nobody is told about is a queue nobody
tends. A Supabase Database Webhook posts each new suggestion to
[`app/api/suggestions/notify`](../app/api/suggestions/notify/route.ts), which opens a GitHub issue.

**The issue never contains the suggested text.** This repository is public, so its issues are
public. Echoing `proposed_text` would publish unmoderated writing the instant it was submitted —
precisely what approve-first prevents — and would put anything abusive in the issue tracker under
the maintainer's name, indexed by search engines. The issue carries the principle slug, the author's
login, the row id and a dashboard link. Reading the suggestion means opening Supabase, where RLS
still applies.

The endpoint authenticates with a shared secret compared in constant time, and returns `501` rather
than acting when `SUGGESTION_WEBHOOK_SECRET` or `GITHUB_TOKEN` is unset — an unconfigured deployment
must never become an open relay to the GitHub API. `/api` is excluded from the proxy matcher: these
routes authenticate with a header, not a cookie, so refreshing a session for them would spend a
round-trip to Supabase and refresh nothing.

An `/admin` route is worth building only once volume justifies it. It would need: an allowlist by
GitHub login, a **server-side** service-role client, and a `moderated_by` audit column. The service
role key must never reach the browser.

## Sequence

Each phase leaves `main` deployable and CI green.

- [x] **Phase 0 — Stable IDs.** Slugs, `data-principle-id`, `key={principle.id}`. Pure refactor;
      the site is byte-for-byte identical to a reader.
- [ ] **Phase 1 — Supabase and auth.** Provision through the Vercel Marketplace, `vercel env pull`,
      run the migration, add the client/server/middleware files and the auth menu. Sign-in works;
      nothing else changes.
- [x] **Phase 2 — Write path, affordances first.** The pencil beside each principle and the `+` row
      below the tenth, both shown to *everyone*. Sign-in is asked for at submit, not at open.
- [ ] **Phase 3 — Read path.** Bubble counts beside each principle, the suggestions panel, and the
      vote-sorted list of proposed principles.
- [ ] **Phase 4 — Voting.** The optimistic vote button.
- [ ] **Phase 5 — Real-time.** One channel in the provider. Approvals and counts push live.
- [ ] **Phase 6 — Polish.** Accessibility sweep, rate-limit tuning, possibly `/admin`.

## Verification

**The static shell is the key regression gate.** `npm run build` must continue to mark `/` as
`○ Static`, never `ƒ Dynamic`. With JavaScript disabled, view-source must still contain every
principle.

**RLS is proven, not assumed.** Run `npm run test:rls`
([`scripts/rls-leak-test.mjs`](../scripts/rls-leak-test.mjs)) before shipping any change to the
policies. It creates a throwaway user, inserts a pending suggestion as that user, and deletes
everything afterwards. All eight checks passed on 2026-07-09:

- Anonymous readers **cannot** see a pending suggestion. *(This is the leak test.)*
- The author **can** see their own pending row — what powers *awaiting review*.
- Self-approval → `403`. Pre-approved insert → `403`. Spoofed `author_id` → `403`.
- Voting on a pending suggestion → `403`.
- The sixth suggestion within an hour → `403`, from `under_rate_limit`.

The entire moderation model rests on one SELECT policy. A mistake there publishes unmoderated
text on the manifesto. Keeping email sign-in enabled is what makes this test scriptable — a
password grant yields a real `authenticated` session without a browser.

**Real-time.** Two browsers. Approve a pending row in the dashboard; it appears in both without a
reload. Upvote in one; the count moves in the other. Then confirm `vote_count` still matches
`select count(*) from votes`.

## Sharp edges

- **Hydration.** This repo has already fixed one hydration warning. Every Supabase-dependent node
  must render identically on the server and on the first client paint — `null` until `mounted`
  flips inside `useEffect`. Never render a count during SSR. Do not spread
  `suppressHydrationWarning` beyond `<body>` to paper over a real mismatch.
- **`whileInView` and client-injected DOM.** The existing `<motion.li>` uses
  `viewport={{ once: true }}`. An element that mounts after hydration while already in view can
  get stuck hidden if given its own `whileInView`. Use plain `animate` for client-injected nodes.
- **Middleware and static prerender.** Adding `middleware.ts` must not turn `/` dynamic. Check the
  build output.
- **The free tier pauses after roughly seven days of inactivity.** Reads then fail. The client must
  fail soft: bubbles render empty and the manifesto never blocks on Supabase.
- **OAuth redirect mismatch**, the classic setup failure. The GitHub App's callback points at
  *Supabase* (`https://<ref>.supabase.co/auth/v1/callback`). Supabase's redirect list must include
  both `http://localhost:3000/**` and production. Three places; all must agree.
- **Vote count drift.** Denormalized counts drift under bulk edits. Treat the row's `vote_count` as
  the source of truth over optimistic local state, and keep a reconciliation query on hand.
