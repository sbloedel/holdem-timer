# Hold'em Timer

A small React + TypeScript single-page app. The first page is a countdown
timer (defaults to 20 minutes) displayed as `HH:MM:SS`, built with routing
in place so more pages can be added later.

## Tech stack

- [Vite](https://vite.dev) + React 19 + TypeScript
- [React Router](https://reactrouter.com) for client-side routing
- [Vitest](https://vitest.dev) + [Testing Library](https://testing-library.com) for tests
- [oxlint](https://oxc.rs) for linting
- [rollup-plugin-visualizer](https://github.com/btd/rollup-plugin-visualizer) to inspect bundle size / tree-shaking

## Project structure

```
src/
  components/   Reusable, presentational components (CountdownTimer, Layout)
  hooks/        Reusable stateful logic (useCountdown)
  pages/        Route-level components (one per page/route)
  routes/       Central route configuration (routes.tsx)
  services/     Framework-agnostic logic (API calls, business rules, presets)
  tests/        Test suite (Vitest + Testing Library)
  types/        Ambient type declarations for non-standard browser APIs
```

To add a new page:
1. Create a component in `src/pages/`.
2. Register it in `src/routes/routes.tsx`.
3. Add any supporting logic under `hooks/`, `services/`, or `components/`.

## Blind level audio cues

When the blinds go up the app plays a synthesized "ding-ding" bell chime
(Web Audio API — no audio assets shipped), and once the chime has rung out
it speaks "Blinds have gone up" via the Web Speech API. Both are
feature-detected, so nothing breaks in browsers that lack them, and any
queued announcement is cancelled before a new one so rapid level skips
don't stack up.

Speech synthesis is notoriously inconsistent across engines, so the
announcement defends against several well-known failure modes:

- **Utterance garbage collection** — Chrome and Firefox can collect a
  still-speaking `SpeechSynthesisUtterance` that nothing references, cutting
  it off (often before it starts). The active utterance is held in module
  scope for its whole lifetime.
- **`cancel()` then `speak()` in the same tick** — reliably silent in
  Chrome/Edge. We only `cancel()` when something is actually speaking or
  pending, and always `speak()` on a later tick.
- **Voices load asynchronously** — `getVoices()` is empty until the engine
  finishes enumerating. We wait for `voiceschanged` with a timeout fallback
  (Firefox and some Chrome builds never fire it), and explicitly pick an
  English voice.
- **A stuck `paused` engine** swallows every utterance, so `resume()` is
  called when `paused` is set.
- **Silent queue stalls** — a watchdog retries once if the utterance never
  starts, and an `onerror` handler plus a final warning log mean failures
  surface in the console instead of disappearing.

**Silent-switch caveat:** the cue is played through the Web Audio API and
the page opts into the `playback` audio session
(`navigator.audioSession.type = 'playback'`, Safari/iOS 16.4+), which lets
audio keep playing on iOS with the hardware mute switch engaged. This is
**best-effort and browser-dependent** — overriding the silent switch cannot
be guaranteed on every device or OS version. The AudioContext is created and
resumed, and speech synthesis is unlocked with a silent utterance, from the
play button (a user gesture) so autoplay policies don't block the first cue.

## npm scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the Vite dev server with HMR |
| `npm run build` | Type-check, build for production (`dist/`) and run the SEO prerender step |
| `npm run build:analyze` | Production build + generates `dist/stats.html` bundle report |
| `npm run build:pages` | Production build for GitHub Pages (same as `build`) |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run oxlint |
| `npm run typecheck` | Type-check without emitting |
| `npm run test` | Run the test suite once |
| `npm run test:watch` | Run the test suite in watch mode |

## SEO and the prerender build step

GitHub Pages has no server-side rewrites, so a direct request to a client-side
route has no matching file and is served by `404.html` with an HTTP 404 status.
When `404.html` was a byte-for-byte copy of `index.html`, every unknown path
*and* the real `/settings` route returned identical HTML, which Google reports
as **"Duplicate without user-selected canonical"**.

`scripts/prerender.mjs` runs after `vite build` (part of `npm run build` and
`npm run build:pages`) and rewrites the built `index.html` with plain string
replacement — no extra dependencies — to emit:

| Output | Purpose |
|---|---|
| `dist/settings/index.html` | Real **200** page for `/settings`, with its own `<title>`, meta description and self-referencing canonical |
| `dist/404.html` | SPA fallback for genuinely unknown paths — carries `<meta name="robots" content="noindex">` and **no** canonical, so unknown paths are never treated as duplicates |

`public/robots.txt` and `public/sitemap.xml` are copied to `dist/` by Vite.

Other moving parts:

- **`index.html`** holds the baseline metadata (title, description, keywords,
  absolute `https://` canonical, Open Graph / Twitter cards, and a
  `WebApplication` JSON-LD block). The absolute canonical is what collapses the
  `http://`, `https://www.` and `/index.html` variants into one indexable URL.
- **Crawlable content** — `#root` ships a static, keyword-rich `<h1>` + feature
  list between the `<!-- seo-placeholder:start/end -->` markers. React's
  `createRoot()` clears the container on its first commit, so the app replaces
  it entirely. The prerender script swaps this block per route.
- **`src/hooks/useSeo.ts`** keeps `document.title`, the meta description, the
  canonical link and the robots directive in sync on client-side navigation.
  It is wired into `TimerPage`, `SettingsPage` and `NotFoundPage`; the 404 route
  sets `noindex` and emits no canonical, and both are reconciled away when you
  navigate back to an indexable route.

When adding a new route, register it in `src/routes/routes.tsx`, call `useSeo`
in the page component, add it to `public/sitemap.xml`, and add a prerendered
`dist/<route>/index.html` in `scripts/prerender.mjs`.

## CI/CD (GitHub Actions)

Both workflows run on GitHub-hosted runners, which are free for public
repositories.

- **`.github/workflows/ci.yml`** — on every push/PR to `main`: lint,
  type-check, run tests, build, and produce a bundle-size report
  (`dist/stats.html`) as a build artifact.
- **`.github/workflows/deploy.yml`** — on push to `main`: builds the app
  (tree-shaken and minified via Vite/Rolldown) and deploys `dist/` to
  GitHub Pages using the official `actions/upload-pages-artifact` and
  `actions/deploy-pages` actions.

To enable Pages deployment on GitHub: **Settings → Pages → Source →
GitHub Actions**. Also tick **Enforce HTTPS** there, so `http://holdem-timer.com/`
redirects to `https://` instead of serving a duplicate 200 response. Once
enabled, the app will be available at `https://holdem-timer.com/`.
