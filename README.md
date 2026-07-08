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
4. To prototype is to speak.
5. Taste is what survives your own bad prototypes.
6. Prototyping is thinking.
7. Production over perfection.
8. One prototype is worth a thousand discussions.
9. Quantity creates quality.
10. "Fears about prototyping fall into two families: fears about yourself and
    fears about your reception by others." — David Bayles and Ted Orland

## Tech stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- [Tailwind CSS](https://tailwindcss.com) v4
- [shadcn/ui](https://ui.shadcn.com) project structure (`components/ui`)
- [framer-motion](https://www.framer.com/motion/) for entrance animations
- [lucide-react](https://lucide.dev) for icons

## Getting started

```bash
git clone https://github.com/Dekic648/prototypers-manifesto.git
cd prototypers-manifesto
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Project structure

```
app/
  layout.tsx          # metadata + fonts
  page.tsx            # composes the background + manifesto
  globals.css         # Tailwind + theme tokens
components/ui/
  particle-field.tsx  # interactive canvas background
  manifesto-hero.tsx  # header, quote, and the ten principles
lib/
  utils.ts            # cn() class-name helper
```

## Contributing

Contributions are welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

[MIT](./LICENSE)
