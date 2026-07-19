# Changelog

All notable changes to this project. Newest first.

This project has no released versions — it is a continuously deployed site.
Entries are grouped by the day the work landed on `main`.

---

## 2026-07-19 — A heartbeat, after the database paused

### Fixed

- **The site's Supabase project had paused, and sign-in, suggestions and voting
  all stopped at once.** Supabase pauses a free-tier project after 7 consecutive
  days without activity. When it pauses, the API hostname stops resolving —
  `rzxmzaasqqfqdknppvps.supabase.co` returned NXDOMAIN, so every auth call and
  every query failed at the DNS layer.

  The manifesto itself kept rendering throughout, because the ten principles
  live in the bundle rather than the database. That made the outage look like a
  partial front-end bug when it was a total back-end one. Restoring the project
  from the Supabase dashboard brought it back with all 6 suggestions and 11
  votes intact; no data was lost, and no redeploy was needed, because the
  project URL and anon key survive a pause unchanged.

### Added

- **A daily cron keeps the database awake.** `/api/keepalive` runs a `HEAD`
  count against `suggestions` and `vercel.json` calls it at 07:00 UTC. Any
  request resets Supabase's 7-day inactivity clock; the query is the cheapest
  one that still reaches Postgres.

  It reads as anon, so RLS still applies — this is a heartbeat, not a back door.
  It authenticates with `CRON_SECRET` in constant time, the way
  `/api/suggestions/notify` does, and returns 501 rather than running unguarded
  if that variable is missing.

  Both failure modes here are silent ones, so both are made loud. The route is
  `force-dynamic`, because a cached 200 would report success without ever
  touching the database. And it returns 500 — never 200 — when the query
  errors, so a heartbeat that stopped landing shows up as a failed invocation
  in Vercel instead of a green cron over a project that pauses anyway.

  The honest limit: this defends against pausing from inactivity, not against
  anything else that takes the project down. It is a keepalive on a free tier,
  not a substitute for paying for one that never pauses.

## 2026-07-10 — Voting without an account

### Changed

- **Upvoting no longer requires signing in.** Clicking the arrow mints an
  anonymous Supabase session (`signInAnonymously()`) and votes with it.

  An anonymous user is a real row in `auth.users` holding the `authenticated`
  role, so `unique (suggestion_id, voter_id)` still enforces one vote per
  identity, the `votes_sync_count` trigger still maintains the count, and a vote
  can still be taken back. The `votes` policies are unchanged.

  The honest limit: a cleared cache or a second browser is a new identity.
  Counts are directional, not a headcount.

- **Signing in after voting anonymously keeps your votes.** `linkIdentity()`
  upgrades the anonymous `auth.users` row in place rather than minting a second
  one. If linking fails (manual linking disabled, or that GitHub account is
  already a user) it falls back to a normal sign-in, and the anonymous votes are
  stranded — a dead sign-in button would be worse.

- **Suggesting still requires a real account.** Anonymous users hold the
  `authenticated` role, so every `to authenticated` policy silently began
  accepting them. `0004_anonymous_voting.sql` rewrites the two `suggestions`
  write policies to demand a non-anonymous session. Without that migration,
  enabling anonymous sign-ins would allow anonymous unmoderated submissions.

### Fixed

- Several checks asked `if (!user)` to mean "signed out". An anonymous voter is
  truthy, so they wrongly read as signed in: the auth menu showed a "signed in"
  pill with a Sign out button, and the suggest dialog offered a submit that RLS
  would reject. `lib/auth.ts` now distinguishes `isRealUser` from `isAnonymous`.

### Supabase configuration

Done on the live project. Anyone standing this up from scratch needs the same
three, **in this order**:

1. Apply `supabase/migrations/0004_anonymous_voting.sql` **first**.
2. Then enable **Anonymous sign-ins** (Authentication → Sign In / Providers).
3. Then enable **Manual linking**, which `linkIdentity()` requires.

Doing (2) before (1) leaves a window in which anonymous users can insert
suggestions, because they hold the `authenticated` role the moment the feature
is on. Skipping (3) is not fatal but silently strands anonymous votes when
someone later signs in.

### Verified

Against the live database, with an anonymous session:

- The JWT carries `role=authenticated` and `is_anonymous=true`, and
  `is_anonymous_session()` agrees.
- Voting returns `201` and the trigger increments `vote_count`; un-voting
  returns `204` and it decrements.
- Inserting a suggestion fails with
  `new row violates row-level security policy`, and nothing persists.

  Worth recording: the first attempt at this probe passed for the wrong reason.
  It included `status`, which `0002` does not grant to `authenticated`, so it
  was rejected on a column privilege without ever reaching the policy. Only a
  probe restricted to the six granted columns actually tests the anonymity
  check.

And in a real browser against production, signed out: the count increments, the
vote survives a reload, and the auth menu still reads "Sign in".

---

## 2026-07-10 — Custom domain and diagnosable auth

The site moved to its own domain, and sign-in stopped failing silently.

### Added

- **Sign-in failures now explain themselves**
  ([`components/auth/auth-error-notice.tsx`](./components/auth/auth-error-notice.tsx)).
  Supabase reports OAuth failures in the URL **hash fragment**, which browsers
  never transmit to the server. `app/auth/callback/route.ts` could therefore
  only observe a missing `code` and redirect to `/?auth_error=1` — the actual
  reason was discarded. The reason is now read on the client, shown in a
  dismissible banner, logged to `console.error`, and the URL is scrubbed so a
  refresh or a copied link doesn't replay a stale error.

  Implemented with `useSyncExternalStore` rather than `setState` inside an
  effect: the URL is an external store, `getSnapshot` stays referentially
  stable, and a `null` server snapshot means the banner appears after hydration
  with no mismatch.

### Changed

- `metadataBase` now points at `https://theprototypersmanifesto.com`
  ([`app/layout.tsx`](./app/layout.tsx)). It drives the absolute URLs for the
  OpenGraph and Twitter card images, so leaving it on the `.vercel.app` host
  would have made every social share reference the old domain.
- Bug-report issue template placeholder updated to the new domain.

### Infrastructure (not tracked in git)

- Registered **`theprototypersmanifesto.com`** through Vercel and attached it to
  the `prototypers-manifesto` project. Nameservers: `ns1/ns2.vercel-dns.com`.
- `www` redirects to the apex with a **308 Permanent Redirect** — permanent so
  search engines consolidate onto one host, and 308 rather than 301 so `POST`
  requests to the API routes keep their method.
- Supabase **Site URL** and **Redirect URLs** updated to the new domain.
  The GitHub OAuth App's callback URL is unchanged: it points at Supabase
  (`https://<project-ref>.supabase.co/auth/v1/callback`), never at this site.

---

## 2026-07-09 — Suggestions, voting, moderation

The manifesto became something other people can change. The bulk of the
application was built on this day; see
[`docs/IMPROVEMENT_PLAN.md`](./docs/IMPROVEMENT_PLAN.md) for the design.

### Added

- **Supabase auth plumbing and a sign-in menu** — GitHub OAuth, browser and
  server clients, and a `proxy.ts` (Next 16's renamed `middleware`) that
  refreshes the session cookie without opting `/` out of static rendering.
- **Suggest an edit**, and an open eleventh line inviting a new principle.
- **Suggestion counts and a panel** to read what people proposed.
- **Voting**, and proposed principles made visible.
- **Live updates** — approvals and vote counts pushed over Supabase realtime.
- **`/admin`** so approving a suggestion no longer means writing SQL by hand.
- **A GitHub issue is opened when a suggestion arrives**, without publishing the
  suggestion itself.
- **Stable principle IDs.** Each principle carries an immutable slug; votes and
  suggestions are keyed to it. Reordering the list is safe, renaming an `id` is
  not — it orphans every suggestion attached to it.
- **CI, issue and PR templates, and a code of conduct.** Lint and build run on
  every pull request.
- **An About page**, a themed 404, a social card, a favicon, and Vercel
  Analytics.

### Changed

- Title reworded to **The Cult of Prototyping**; three principles rewritten.
- Smoother scroll-in animation, tighter spacing, footer removed. The per-index
  stagger was removed from the scroll animation — reusing the header's stagger
  meant the tenth principle waited about a second after entering the viewport,
  which read as lag rather than rhythm.

### Fixed

- **Clients could write columns the RLS policies never guarded**
  (`0002_tighten_columns.sql`).
- **Hardened the edges**: clickjacking (`X-Frame-Options`, `frame-ancestors`),
  open redirect in the auth callback, and markdown injection in the GitHub
  issue body.
- **A vote test that only passed against an empty table**, and test suites that
  never reached the assertions they claimed to make.
- Hydration warning on `<body>` caused by browser extensions injecting
  attributes before React hydrates.

---

## 2026-07-08 — First light

### Added

- **Initial commit.** A one-page manifesto: header, the Bayles & Orland
  epigraph, and the ten principles. Next.js App Router, TypeScript, Tailwind
  CSS v4, shadcn/ui project structure, `framer-motion` for entrance animation,
  `lucide-react` for icons. README, CONTRIBUTING, and an MIT license.
- **An interactive particle-field background**
  ([`components/ui/particle-field.tsx`](./components/ui/particle-field.tsx)) —
  particles drift, repel from the pointer, and connect with fading lines.

### Fixed

- **The particle background was invisible.** `<main>` carried `bg-black`, an
  opaque layer painted directly over the `fixed -z-10` canvas. The canvas draws
  its own black backdrop, so `main` needed no background at all.
- **Mobile behaviour of the particle field:**
  - Touch now drives the same repel interaction as the mouse.
  - Particles are no longer rebuilt on height-only resizes. Mobile browsers fire
    `resize` whenever the address bar shows or hides during scroll, and the
    field was re-randomising on every one of them — visibly resetting as you
    scrolled.
  - Rendered at `devicePixelRatio` (capped at 2) for crisp lines on retina,
    while density stays measured in CSS pixels so the particle count doesn't
    explode on 3× displays. Count capped, since the line-drawing is O(n²).
  - Interaction radius scales to the shorter viewport edge instead of a fixed
    200px that swallowed half a phone screen.
  - Respects `prefers-reduced-motion` with a single static frame.
  - The canvas is `pointer-events-none`, so it never blocks scrolling.
