# Per-tab ErrorBoundary

Opened: 2026-10-25. Source: `README.md` "Decisions" (Error boundaries), `docs/architecture.md` "Open".

## Why it matters

Only the root layout exports `ErrorBoundary`, so a render error in one tab replaces the whole app with the error screen.

## Facts (measured or verified)

- `src/app/_layout.tsx` exports `ErrorBoundary` rendering `RouteError` (verified: file); the tab folders `(home)` and
  `(settings)` each have a `_layout.tsx` Stack without one (verified: `src/app`).
- `RouteError` takes `{ error, retry }` from `ErrorBoundaryProps` and renders `ErrorState` (verified: file).

## Ideas (not verified)

- Idea: export `ErrorBoundary` from each tab `_layout.tsx`, reusing `RouteError`, once tabs hold real screens.
- Unverified: how a tab-level boundary interacts with `NativeTabs` retry behaviour; test on the emulator.

## Start when

The first real feature screen replaces the base-check screen.

## Done when

A thrown render error in one tab shows the error state inside that tab, the other tabs and the tab bar keep working
(emulator check), and a test covers the boundary.

## Docs touched

`docs/architecture.md`, `README.md` (Error boundaries decision), `docs/design-system.md` (state usage table).
