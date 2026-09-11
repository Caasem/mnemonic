# Mnemonic

A personal memory system for capturing anything worth remembering, scheduled
for review with FSRS (spaced repetition). Black & white, minimal, iOS-inspired
design that works on phone, tablet, and desktop.

## Running it

The app is a static PWA — no server required at runtime. Open `dist/index.html`
directly in a browser, or serve the `dist/` folder with any static file server:

```
npx serve dist
# or
python3 -m http.server 5173 --directory dist
```

Then open it in Chrome/Safari/Edge and, on mobile, use "Add to Home Screen" to
install it like a native app.

## Deploying to GitHub Pages (free public hosting, no PC required to use it)

The app is already Pages-ready: every asset reference in `dist/` is a
relative path (`./app.css`, `./icons/...`), and routing is hash-based
(`#/memory`, `#/settings`, …) so there's no server-side rewrite rule needed —
this works identically whether it's served at a domain root or at a GitHub
Pages project subpath like `you.github.io/mnemonic/`.

A ready-made workflow at `.github/workflows/deploy.yml` deploys the committed
`dist/` folder on every push to `main` — no build step runs in CI, so you
don't need npm registry access there either.

**One-time setup:**

1. Create a new repo on GitHub (public or private — Pages works for both on
   any plan), e.g. `mnemonic`. Don't initialize it with a README.
2. From this folder, push it:
   ```
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<you>/mnemonic.git
   git push -u origin main
   ```
3. On GitHub: repo → **Settings → Pages** → under "Build and deployment",
   set **Source** to **GitHub Actions** (not "Deploy from a branch").
4. Push (step 2 already did) — check the **Actions** tab for the
   "Deploy to GitHub Pages" run. When it finishes, your app is live at:
   ```
   https://<you>.github.io/mnemonic/
   ```

**After that**, every time you want to update the live app: rebuild
(`node scripts/build.mjs`), commit the changed `dist/` files, and push to
`main` — the workflow redeploys automatically in under a minute. Open that
URL on your tablet and "Add to Home Screen" to install it as a PWA — no PC
needs to be running.

## Developing

Source lives in `src/`. The build is a small esbuild-based script (see
`scripts/build.mjs`) rather than Vite, because this project was built in an
environment where the npm registry was unreachable — `react`, `react-dom`,
`typescript`, and `esbuild` are resolved via the `node_modules` symlinks in
this folder pointing at globally-installed copies. If you have normal npm
registry access, you can freely switch this to a standard Vite setup:

```
npm create vite@latest . -- --template react-ts
npm install ts-fsrs dexie react-router-dom vite-plugin-pwa
```

The current hand-rolled FSRS engine (`src/fsrs/engine.ts`) implements the
FSRS-6 algorithm directly and can be swapped for the real `ts-fsrs` package
as a drop-in replacement — the function signatures were designed to match.
Similarly `src/db/database.ts` is a minimal IndexedDB wrapper that could be
swapped for `dexie` without touching `src/db/repository.ts`.

Build commands:

```
node scripts/build.mjs            # one-off production build -> dist/
node scripts/build.mjs --watch    # rebuild on change
node scripts/build.mjs --watch --serve   # rebuild + serve on :5173
./node_modules/.bin/tsc --noEmit  # typecheck
node scripts/e2e-test.mjs         # Playwright smoke test (requires --serve running)
```

## Architecture

- `src/core/types.ts` — domain types: `Memory`, `FsrsCard`, `ReviewLogEntry`, `Settings`.
- `src/core/dates.ts` — relative date parsing ("yesterday", "last week") and formatting.
- `src/fsrs/engine.ts` — FSRS-6 scheduling algorithm.
- `src/db/database.ts` — IndexedDB wrapper (stores: memories, reviewLog, collections, settings).
- `src/db/repository.ts` — domain-level CRUD operations used by the UI.
- `src/components/Router.tsx` — minimal hash-based router (4 routes: memory/schedule/review/insights).
- `src/pages/*.tsx` — the four main screens described in the app brief.
- `src/styles/index.css` — the entire design system (CSS custom properties, iOS-style
  components: nav bars, tab bars, grouped lists, sheets, segmented controls).

## Data model

Each memory captures the content plus optional prompt/answer/tags/collection/
type/parent, a `createdAt` (when added to Mnemonic) separate from `learnedAt`
(when actually learned, can be backdated), and an attached FSRS `card` with its
own scheduling state — the same split described in the app brief (memory =
the thing you want to retain, card = your current memory state for it).

## What's implemented

All four sections from the brief: Memory (quick add, inline editing, hierarchy
via `collection`/`tags`, completion toggle independent of FSRS), Schedule
(Agenda / Calendar / Matrix views, Matrix has a print stylesheet), Review
(active recall with Again/Hard/Good/Easy mapped to real FSRS-6 scheduling,
plus Review Ahead via `#/review?ahead=1`), and Insights (memory counts, due
today, retention, reviews completed, stable memories, lapses, by-collection
and by-type breakdowns, 12-week activity heatmap).

PWA: manifest + service worker (offline-capable, installable) + generated
icons (including maskable variants for Android's adaptive icon system).

## What's not implemented yet

Per the brief's "potential future capabilities" list: cloud sync, accounts,
Anki import/export, browser capture, notifications, and backup/export are all
left for later — the current build is local-only (IndexedDB), matching the
brief's "local storage / IndexedDB initially" instruction.
