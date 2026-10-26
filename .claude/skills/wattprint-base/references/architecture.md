# Architecture digest

Use when adding a feature, a screen or a route, or when the boundary lint complains. Full rules:
[docs/architecture.md](../../../../docs/architecture.md).

## Decision matrix

| Need                                   | Where it goes                                                                               |
| -------------------------------------- | ------------------------------------------------------------------------------------------- |
| A new domain (energy, dashboard, chat) | One folder `src/features/<name>` with its own api, schemas, queries, UI and tests           |
| A route                                | `src/app/<tab>/...`: read params, render a screen from `src/features/<name>/screens`        |
| A screen that composes 2+ features     | `src/screens/<name>` (`src/screens/home` composes `devices` and `energy`)                   |
| State two tabs share                   | A provider in the owning feature, mounted in `src/app/_layout.tsx` (`DeviceStatesProvider`) |
| Wiring (http, query client, storage)   | `src/lib`; app-wide stores in `src/stores`; strings in `src/i18n`                           |
| Something both features need           | Duplicate first; extract to `src/components` or `src/lib` only on the second use            |

## Slice shape

`<feature>/api.ts` (fetch + Zod parse, the only caller of the client), `<feature>/schemas.ts` (only fields the UI uses), `<feature>/queries.ts` (key factory and
`queryOptions`), `hooks/use-*.ts`, `components/`, `screens/*-screen.tsx`, an optional store file (`src/features/<name>/store.ts`), colocated `*.test.ts(x)`.
No barrel files. File names are kebab-case; component files are feature-prefixed.

## Never do

- Import `@/app`, `@/screens`, another feature or `../` from a feature (use `./` or `@/features/<self>/...`).
- Import `components`, `features`, `screens` or `app` from `lib`, `stores`, `hooks`, `i18n` or `env.ts`.
- Put screen logic in `src/app`, or add an `index.ts` that re-exports.
- Compose two features inside one of them: do it in `src/screens` or in the route.

`devices` and `energy` are mock-backed today: `schemas.ts`, `mock-data.ts`, `*-selectors.ts`, hooks, components, screens, no `<feature>/api.ts` or
`<feature>/queries.ts` until a backend contract exists.

Guards: `eslint.boundaries.js`, `scripts/boundaries.test.ts` (per-feature rules are generated from the folders in `src/features`).
