# Prototyper's Manifesto

> I prototype, therefore I am.

A single-page, open manifesto for people who build to think. Ten principles,
an interactive particle background, and a permanent invitation to contribute.

> "The function of the overwhelming majority of your artwork is simply to teach
> you how to make the small fraction of your artwork that soars."
> — David Bayles and Ted Orland

## The ten principles

1. A prototype is an answer to a question. No question, no prototype.
2. Prototype first to learn, second to prove.
3. Build ten wrong things to find the one that isn't.
4. Fall in love with finding out.
5. Taste is what survives your own bad prototypes.
6. To prototype is to think; prototyping is thinking.
7. Quantity creates quality.
8. The only thing stopping you from prototyping is the fear of finding out.
9. Even the shittiest idea deserves to be prototyped.
10. "Fears about prototyping fall into two families: fears about yourself and
    fears about your reception by others."

## Tech stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- [Tailwind CSS](https://tailwindcss.com) v4
- [shadcn/ui](https://ui.shadcn.com) project structure (`components/ui`)
- [framer-motion](https://www.framer.com/motion/) for entrance animations
- [lucide-react](https://lucide.dev) for icons
- [Supabase](https://supabase.com) for sign-in, suggestions and voting

## Getting started

```bash
git clone https://github.com/Dekic648/prototypers-manifesto.git
cd prototypers-manifesto
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

The manifesto renders without any configuration. Supabase is only needed to work
on sign-in, suggestions or voting; without it those features simply don't appear.

### Working on the suggestion features

Copy [`.env.example`](./.env.example) to `.env.local` and fill in the three values
from your Supabase project (Project Settings → API Keys). Note that
`vercel env pull` returns *empty strings* for the Supabase Marketplace variables,
so they have to be copied by hand.

Then apply [`supabase/migrations/0001_suggestions.sql`](./supabase/migrations/0001_suggestions.sql)
in the Supabase SQL editor, and enable the GitHub provider under
Authentication → Sign In / Providers.

The OAuth chain trips people up, so to be explicit: your **GitHub OAuth App's
callback URL points at Supabase**, not at this site —
`https://<project-ref>.supabase.co/auth/v1/callback`. Supabase then redirects to
`/auth/callback` here. Both `http://localhost:3000/**` and your production URL
must be listed under Authentication → URL Configuration.

See [`docs/IMPROVEMENT_PLAN.md`](./docs/IMPROVEMENT_PLAN.md) for the full design.

## Project structure

```
app/
  layout.tsx          # metadata + fonts + auth menu
  page.tsx            # composes the background + manifesto (must stay static)
  globals.css         # Tailwind + theme tokens
  auth/callback/      # OAuth code -> session exchange
components/
  auth/auth-menu.tsx  # sign in / avatar / sign out
  ui/
    particle-field.tsx  # interactive canvas background
    manifesto-hero.tsx  # header, quote, and the ten principles
lib/
  utils.ts            # cn() class-name helper
  supabase/           # browser + server clients, session refresh
proxy.ts              # refreshes the auth cookie (Next 16's former "middleware")
supabase/migrations/  # schema, RLS policies, rate limit
```

## Contributing

Contributions are welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md).

## Changelog

What has changed, and why — see [CHANGELOG.md](./CHANGELOG.md).

## License

[MIT](./LICENSE)
