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

## Pull request checklist

1. Fork the repo and create a branch: `git checkout -b my-change`.
2. Make your change. Keep it focused — one idea per PR.
3. Run `npm run lint` and `npm run build`; both must pass.
4. Write a clear PR description explaining the *why*, not just the *what*.

## Code style

- TypeScript, no `any`.
- Tailwind utility classes; use the `cn()` helper in `lib/utils.ts` to merge.
- Keep components in `components/ui/` following the shadcn convention.

## Code of conduct

Be kind, be constructive, assume good faith. Prototypes are how we think out
loud — the same generosity applies to reviewing each other's work.
