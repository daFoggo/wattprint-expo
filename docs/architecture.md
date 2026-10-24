# Architecture

Decision (2026-10-25): **feature slices with thin routes**. Rationale and research: `docs/superpowers/specs/2026-10-25-data-architecture-design.md`. Trial: the `lab` feature (`src/features/lab`, dummyjson) was built in this layout; boundary lint, colocated tests, thin routes and the benchmark screens all worked without friction. Numbers: `docs/benchmarks/2026-10-25-baseline.md`.

Expo has no official feature-based standard (its guidance is type-based, routes only in `src/app`). Feature slices are our choice: one domain's api, schemas, queries, hooks, UI and tests live together, so a new domain (energy, dashboard, chat, auth) is one folder.

## Layout

```
src/
  app/                routes only: read params, render a screen, layouts, ErrorBoundary, +not-found
  features/<name>/    api.ts          fetch + Zod parse; the only caller of the http client
                      schemas.ts      Zod DTOs + inferred types (only fields the UI uses)
                      queries.ts      key factory + queryOptions (mutations.ts if needed)
                      hooks/          use-*.ts composed hooks
                      components/     feature UI
                      screens/        *-screen.tsx rendered by routes
                      store.ts        feature Zustand store, only if needed
                      *.test.ts(x)    colocated (feature-specific extra folders, e.g. lab/bench, are allowed)
  screens/            only screens that compose 2+ features
  components/ui/      gluestack (hand-copied)        components/states/  loading, empty, error
  lib/                http, errors, query-client, online-manager, nav-theme, storage, bench-log
  stores/             app-wide stores (preferences; session planned)      hooks/  i18n/  env.ts
```

## Rules

The first three are enforced by `eslint.boundaries.js` (proved by `scripts/boundaries.test.ts`); the rest are conventions checked in review. `src/env.ts` is covered for alias imports only.

- A feature never imports `@/app`, `@/screens` or another feature; no `../` inside a feature (use `./` or `@/features/<self>/...`).
- `lib`, `stores`, `hooks`, `i18n`, `env.ts` never import `components`, `features`, `screens`, `app`.
- `components` never imports `features`, `screens`, `app`. `screens` never imports `app`.
- No barrel files in features (Metro evaluates every re-export at startup; unverified, but free to avoid). A component folder's `index.tsx` is a component root, not a barrel.
- Routes are thin: params in, screen out. Screen logic never lives in `src/app`.
- Extract to shared (`components/`, `lib/`) only when a second feature needs it, it has a nameable role, and its API is smaller than its implementation. Until then duplicate.
- Naming: kebab-case; `use-*.ts` hooks; `*-screen.tsx`; feature-prefixed components (`product-row.tsx`).
- Cross-feature composition happens in `src/screens` or in routes, never inside a feature.

## Lab feature

`src/features/lab` is a throwaway trial and benchmark harness. Its tab trigger is hidden when `EXPO_PUBLIC_APP_ENV=production` (not yet checked in a production build); the routes in `src/app/lab` are still bundled and reachable by deep link. Only its routes, the root layout's `lab` tab trigger and its i18n keys reference it; delete them together when the first real feature exists, or keep it only as a dev tool.

## Open

- Per-tab `ErrorBoundary` once tabs hold real screens (the root one replaces the whole shell).
- Import cost of barrels: verify with Expo Atlas if a barrel is ever proposed.
