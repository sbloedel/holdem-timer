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
```

To add a new page:
1. Create a component in `src/pages/`.
2. Register it in `src/routes/routes.tsx`.
3. Add any supporting logic under `hooks/`, `services/`, or `components/`.

## npm scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the Vite dev server with HMR |
| `npm run build` | Type-check and build for production (`dist/`) |
| `npm run build:analyze` | Production build + generates `dist/stats.html` bundle report |
| `npm run build:pages` | Production build with the base path set for GitHub Pages |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run oxlint |
| `npm run typecheck` | Type-check without emitting |
| `npm run test` | Run the test suite once |
| `npm run test:watch` | Run the test suite in watch mode |

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
GitHub Actions**. Once enabled, the app will be available at
`https://<owner>.github.io/holdem-timer/`.
