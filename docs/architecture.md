# Architecture

Decision (2026-10-25): **feature slices with thin routes**. Rationale and research: `docs/superpowers/specs/2026-10-25-data-architecture-design.md`. An example feature (`lab`, dummyjson) was built in this layout as a trial; boundary lint, colocated tests and thin routes worked without friction (opinion). The example feature was removed 2026-10-26.

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
                      *.test.ts(x)    colocated (feature-specific extra folders are allowed)
  screens/            only screens that compose 2+ features
  components/ui/      gluestack (hand-copied)        components/states/  loading, empty, error
  lib/                http, errors, query-client, online-manager, nav-theme, storage
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
- Naming: kebab-case; `use-*.ts` hooks; `*-screen.tsx`; feature-prefixed components (`<feature>-row.tsx`).
- Cross-feature composition happens in `src/screens` or in routes, never inside a feature.

## Current features

`devices` and `energy` exist as mock-backed slices (2026-10-26): `<feature>/schemas.ts` (Zod), `mock-data.ts`, selectors
(`device-selectors.ts`, `energy-selectors.ts`), `hooks/`, `components/`, `screens/` and tests. They have no `<feature>/api.ts` and
no `<feature>/queries.ts` yet, because no backend contract exists; `mock-data.ts` and `*-selectors.ts` are allowed extra files
(opinion: they are feature-specific; a feature-specific extra file is allowed by the layout above). The device on/off state is
`DeviceStatesProvider` (`src/features/devices/device-states.tsx`), mounted in `src/app/(app)/_layout.tsx` above `NativeTabs` so
Home and Devices share it; the root layout may import it because `src/app` is allowed to import features
(verified: `src/features/devices/device-states.tsx`, `src/app/(app)/_layout.tsx`, `eslint.boundaries.js`). `src/screens/home` is the only
screen composing two features; `src/screens/settings` holds the base checks. When a backend contract exists, add
`<feature>/api.ts` and `<feature>/queries.ts` and make the provider read from them.

## Example feature

The throwaway `lab` example feature (routes, tab trigger, i18n keys) was removed 2026-10-26. The first real feature
follows the layout above.

## Open

- Per-tab `ErrorBoundary` once tabs hold real screens (the root one replaces the whole shell).
- Import cost of barrels: verify with Expo Atlas if a barrel is ever proposed.
