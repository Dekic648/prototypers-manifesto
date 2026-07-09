# Contributing

Thanks for wanting to make the Prototyper's Manifesto better. This is a small,
opinionated project — but it is open, and good ideas are welcome from anyone.

## Ways to contribute

- **Refine the principles.** Sharper wording, a clearer example, a better
  ordering. The manifesto lives in
  [`components/ui/manifesto-hero.tsx`](./components/ui/manifesto-hero.tsx).
- **Improve the design or motion** without drowning out the words.
- **Fix bugs** in the particle background or layout.
- **Improve accessibility, performance, or docs.**

Because the wording of a manifesto is deliberate, please **open an issue to
discuss changes to the ten principles before opening a PR.** Code and design
changes can go straight to a PR.

## Development

```bash
npm install
npm run dev        # http://localhost:3000
npm run lint       # eslint
npm run build      # production build (must pass before a PR is merged)
```

### Seeing a hydration mismatch warning?

If `npm run dev` logs *"A tree hydrated but some attributes of the server
rendered HTML didn't match the client properties"*, it is almost certainly a
browser extension — Grammarly, Dark Reader, ColorZilla and password managers all
inject attributes into the page before React hydrates. Confirm by reloading in a
private window with extensions disabled.

The five bullet points React prints below that message are generic suggestions,
not a diagnosis; the real mismatch is shown as a `+`/`-` diff further down in the
browser console. Only file an issue if that diff points at a file in this repo.

## Pull request checklist

1. Fork the repo and create a branch: `git checkout -b my-change`.
2. Make your change. Keep it focused — one idea per PR.
3. Run `npm run lint` and `npm run build`; both must pass.
4. Write a clear PR description explaining the *why*, not just the *what*.

CI runs lint and build on every pull request, so you will see a red check rather
than a surprise if step 3 was skipped.

### The one-minute route, for wording changes

You do not need to clone anything to fix a typo or sharpen a line. Open
[`components/ui/manifesto-hero.tsx`][hero] on GitHub and click the pencil icon.
GitHub will offer to fork the repo for you, let you edit the `PRINCIPLES` array
in the browser, and turn your edit into a pull request when you click *Propose
changes*. No `npm install`, no local setup.

Remember that changes to the ten principles want an issue first — see above.

[hero]: ./components/ui/manifesto-hero.tsx

## Code style

- TypeScript, no `any`.
- Tailwind utility classes; use the `cn()` helper in `lib/utils.ts` to merge.
- Keep components in `components/ui/` following the shadcn convention.

## Code of conduct

Be kind, be constructive, assume good faith. Prototypes are how we think out
loud — the same generosity applies to reviewing each other's work.

The full text is in [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md).
