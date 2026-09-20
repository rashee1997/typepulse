<div align="center">

<img src="public/icon.svg" alt="Runewright logo — an amber keyboard" width="88" height="88" />

# Runewright

**An AI-coached touch-typing studio.** 42 lessons, 12 arcade drills, an adaptive
weak-key engine and an optional AI coach — offline-first, no account, progress in
`localStorage`.

[![License: MIT](https://img.shields.io/badge/license-MIT-f59e0b?style=flat-square)](LICENSE)
[![Next.js 15](https://img.shields.io/badge/Next.js-15-0f172a?style=flat-square)](https://nextjs.org)
[![React 19](https://img.shields.io/badge/React-19.2-0f172a?style=flat-square)](https://react.dev)
[![TypeScript 5.9](https://img.shields.io/badge/TypeScript-5.9-0f172a?style=flat-square)](https://www.typescriptlang.org)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind_CSS-4.1-0f172a?style=flat-square)](https://tailwindcss.com)
[![Node.js 20+](https://img.shields.io/badge/Node.js-20%2B-0f172a?style=flat-square)](https://nodejs.org)
[![No account](https://img.shields.io/badge/data-localStorage_only-0f172a?style=flat-square)](#privacy)

[Quick start](#quick-start) · [Accessibility](#accessibility) ·
[License](#license) · [Third-party notices](#third-party-notices)

</div>

---

## What it is

Most typing sites are either a word-ladder with a scoreboard or a wall of prose.
Runewright is a full practice studio: a 42-lesson curriculum that unlocks keys in
order, twelve arcade drills that make repetition fun, a weak-key engine that
targets the keys you actually miss, and an AI coach you can point at your own
model — or leave off entirely.

It runs on your machine. There is no sign-up, no server database and no
telemetry; the only outbound request is to the AI endpoint you configure
yourself.

## Features

**Learn**
- 42-lesson curriculum with progressive key unlocking, finger guidance and
  per-lesson drills generated from your unlocked alphabet.
- Biometric latency HUD, live WPM/accuracy and a virtual keyboard that flags the
  keys costing you time.

**Play** — twelve arcade drills, including Grand Prix Speedway, Orbital Laser
Defense, Bomb Squad Defusal, Word Blitz, Ghost Duels, Zen Marathon, Weakness
Weaver, Boss Gauntlet and the daily worldwide challenge.

**Improve**
- Adaptive engine that turns your miss history into targeted drills — never
  padding the screen with pseudo-word noise where a real passage belongs.
- Analytics with per-key heatmaps, session history and a target-speed forecast.
- Ghost duels: share a keystroke timeline as a link, race it later.

**Coach (optional)**
- Prompted from your own data. Every request is built by `lib/ai-prompts.ts`
  from a measured profile of this typist — weak keys with error counts, slow
  n-grams with latencies, recent pace trend, lesson progress and the last run —
  so the coach chat, the run debrief, generated missions and drills all answer
  about your typing instead of reciting generic advice. The chat keeps its
  conversation, and falls back to that same profile locally whenever no model
  answers.
- Eight provider presets: Gemini through the built-in server route, plus OpenAI,
  OpenRouter, Groq, DeepSeek, Ollama, LM Studio and any OpenAI-compatible
  endpoint. With no key configured the app runs fully offline and missions are
  generated locally — the board says so instead of pretending otherwise.
- Provider keys you type into Settings stay in your browser and go only to the
  endpoint you chose.

**Polish** — dark/light themes, `⌘K` command palette, Zen mode, mechanical-switch
sound profiles synthesized in the browser, PWA install, and full keyboard
operation with a `Shift+/` shortcut sheet.

## Quick start

```bash
git clone https://github.com/rashee1997/typepulse.git runewright
cd runewright
bun install
bun dev
```

`/` landing · `/docs` documentation · `/app` the studio. Node.js 20+ required.
Any package manager works — `bun.lock` is committed.

### Optional: the hosted coach

Runewright needs no configuration. To enable the built-in Gemini coach, add a
server-side key to `.env.local`:

```bash
GEMINI_API_KEY=your-key-here
```

It is read only by [`app/api/gemini/coach/route.ts`](app/api/gemini/coach/route.ts)
and never reaches the browser; the route answers `503` without it and everything
else keeps working. Set `NEXT_PUBLIC_SITE_URL` in production so canonical URLs
and the sitemap use your origin.

## Scripts

| Command | What it does |
| --- | --- |
| `bun dev` | Development server |
| `bun run build` | Production build (standalone output) |
| `bun start` | Serve the production build |
| `bun run lint` | ESLint |

## Project layout

```
app/            routes: landing, /docs, /app studio, /api, llms.txt, sitemap
components/     studio UI, arcade drills, modals, analytics views
lib/            typing engine, adaptive engine, AI service, curriculum, word banks
hooks/          shared hooks (modal focus, colour scheme, breakpoint)
types/          the shared domain model for the engine and the UI
```

The typing logic is one framework-free class in `lib/typing-engine.ts`; the UI
and the AI layer both sit on top of it, which is why the engine stays testable
without a DOM.

## Privacy

Sessions, settings, achievements and any provider keys live in `localStorage`
(and IndexedDB where a richer store is needed). There is no analytics script, no
cookie and no account. The only network calls are to the AI endpoint you
configure.

## Accessibility

Focus is managed properly in all eleven dialogs (trap, initial focus, return
focus, Escape, background `inert`), every interactive control has a visible
`:focus-visible` ring and an accessible name, dynamic regions are announced, and
transform motion is disabled under `prefers-reduced-motion` while opacity-based
feedback is kept. Text and form boundaries meet WCAG 2.2 AA contrast in both
themes.

## License

[MIT](LICENSE) © 2026 Runewright contributors — use, modify and redistribute it,
including commercially, as long as the copyright and permission notice stay with
the code.

## Third-party notices

Bundled packages keep their own licenses. Attribution below is the notice each
one requires you to retain; if you redistribute a built artefact, keep this
section or the packages' own `LICENSE` files with it.

| Package | License | Attribution / copyright to retain |
| --- | --- | --- |
| `@google/genai` | Apache-2.0 | Google LLC |
| `class-variance-authority` | Apache-2.0 | Joe Bell — Apache-2.0 §4 applies (keep notices, state changes) |
| `typescript` (dev) | Apache-2.0 | Microsoft Corporation — §4 applies |
| `lucide-react` | ISC | Lucide Contributors 2025; portions © Cole Bemis 2013–2023 (Feather, MIT) |
| `canvas-confetti` | ISC | © 2020 Kiril Vatev |
| `next` | MIT | © 2025 Vercel, Inc. |
| `react`, `react-dom` | MIT | © Meta Platforms, Inc. and affiliates |
| `motion` | MIT | © 2024 Motion B.V. |
| `react-markdown` | MIT | © Espen Hovlandsdal |
| `tailwindcss`, `@tailwindcss/typography` | MIT | © Tailwind Labs, Inc. |
| `tailwind-merge` | MIT | © 2021 Dany Castillo |
| `clsx` | MIT | © Luke Edwards |
| `tw-animate-css` | MIT | © 2025 Wombosvideo |
| `postcss`, `autoprefixer` (dev) | MIT | © 2013 Andrey Sitnik |
| `eslint`, `eslint-config-next`, `firebase-tools` (dev) | MIT | OpenJS Foundation; Vercel, Inc.; © 2015 Firebase |
| `@types/*` (dev) | MIT | © Microsoft Corporation |

**Notes on strictness.** Apache-2.0 is the only license here that obliges you
beyond retaining an MIT/ISC notice: it requires keeping copyright, patent,
trademark and attribution notices, shipping a copy of the license, and stating
significant modifications. Neither `@google/genai` nor
`class-variance-authority` ships a `NOTICE` file (verified in `node_modules`), so
there is no additional notice text to reproduce. `@hookform/resolvers` is
declared in `package.json` but not imported anywhere, so it contributes nothing
to shipped output.

**Content and assets.** No third-party content is bundled: the literary quotes
in `lib/quotes.ts` are public domain (authors dead before the 1928 US cutoff),
the word banks, curriculum, story text and character personas are written for
this repository, typing sounds are synthesized at runtime with the Web Audio API
(no audio files ship), and the logo and social image are generated from the
in-repo SVG/JSX. No web fonts are fetched or bundled — the app uses a system font
stack — so no font license attribution is required.
