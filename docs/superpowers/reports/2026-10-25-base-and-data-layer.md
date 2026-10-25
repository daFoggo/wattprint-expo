# Base and data layer report

Date: 2026-10-25. Range: `git log --oneline 6b7d880..b762681` (from the Expo scaffold to the last commit on `main` before the
documentation branch; 82 commits on `main`, counted with `git log --oneline | wc -l` on 2026-10-25). Closes the specs
`../specs/2026-10-24-expo-base-design.md` and `../specs/2026-10-25-data-architecture-design.md` and the plan
`../plans/2026-10-24-expo-base.md` (goals G1 to G5 in [HANDOFF.md](../HANDOFF.md)).

## Status

Done and on `main`. CI is green on `main`: `gh run list --repo daFoggo/wattprint-expo` shows `success` for the last five
runs, newest "ci: run format:check before check to fail fast" (2026-10-25). On the documentation branch,
`npx jest --ci --roots <rootDir>/src <rootDir>/scripts` gave 255 passed and 1 failed of 256 tests (35 suites); the one failure
is `scripts/config-guard.test.ts` "single css entry", caused by a second `src/global.css` found inside the untracked
`.claude/worktrees/agent-a5abcc418e75c49f3` (another session's worktree), not by a code change. On a clean clone that
worktree does not exist. A plain `pnpm check` on a machine with that worktree fails in lint and in that test for the same reason.

## What exists

- App shell: Expo SDK 58 / React Native 0.88 Android dev build; Expo Router with `NativeTabs` (`(home)`, `lab`,
  `(settings)`), a Stack per tab, root `ErrorBoundary`, `+not-found` (`src/app`).
- Styling: Uniwind with semantic tokens (`src/global.css`), hand-copied gluestack v5 `button`, `input`, `modal`, `icon`,
  provider (`src/components/ui`), guards `scripts/uniwind-guard.test.ts`.
- Data layer: `src/lib/http.ts` (`createApiClient`, Zod schema per call, timeout, single-flight 401 refresh),
  `src/lib/errors.ts`, `src/lib/query-client.ts` (`staleTime` 30 s, retry only retryable), `src/lib/online-manager.ts`
  (expo-network), state components `src/components/states`.
- Client state: `src/stores/preferences-store.ts` (Zustand + MMKV through `src/lib/storage.ts`), SecureStore base check,
  i18n en and vi (`src/i18n`), validated env (`src/env.ts`).
- Architecture: feature slices (`docs/architecture.md`), boundary lint (`eslint.boundaries.js`, proved by
  `scripts/boundaries.test.ts`), the `lab` trial feature (`src/features/lab`: products list and detail, list benchmark).
- Tooling: lint with zero warnings, `no-deprecated` in `src`, typecheck, jest-expo and RNTL, Husky, lint-staged,
  commitlint, EAS config with three application ids (`scripts/app-identity.js`), GitHub Actions CI.
- Docs: `README.md`, `AGENTS.md`, `docs/architecture.md`, `docs/data-fetching.md`, `docs/benchmarks/` (baseline, raw data,
  `scripts/bench/`), `docs/superpowers/` (specs, plans, this report, backlog, HANDOFF).

## Review outcome

- G1 (Uniwind native compatibility): independent review APPROVED with one fix wave; `pnpm check` 71 tests, format and
  `expo-doctor` 20/20 green; device tests T1 to T6 passed on the emulator, T4 (first-frame theme flash) inconclusive in a
  dev build (HANDOFF).
- Data layer, lab and architecture: the history shows follow-up fix waves after review-style findings (for example
  `85281c3` Button sizes, `d543cbb` EmptyState slot, `80b008a` `no-deprecated`, `485c799` lint root). **A written verdict for the
  final data-layer review is not recorded in the repository**; this report does not invent one.
- CI: green on `main` (above). Device checks were done on the emulator `Medium_Phone_API_37.0` only.

## Decisions and deviations

- Feature slices with thin routes, chosen after a trial (`docs/architecture.md`). Expo has no official feature-based
  standard; it is our choice.
- `nodeLinker: hoisted`, the Windows CMake workaround plugin, LF line endings (`README.md` "Decisions").
- gluestack CLI is never run; components are hand-copied with stable packages. Deviation from upstream: every `Button` size
  is at least 48dp, and the modal `ZoomIn` initial opacity key was removed (`README.md`).
- `react-native-web` and `react-dom` are installed only as required peers and never imported (guarded).
- Default `staleTime` 30 s, never 0; detail placeholder from list rows; FlashList for lists of a few hundred rows or more;
  these come from the baseline measurements (`docs/data-fetching.md`) with their caveats (emulator, relative, text-only rows).
- Query persistence deferred; auth, chat and per-tab error boundaries designed but not built.
- "My call" items (the user was asleep and opted out of questions): recorded in the specs under "my calls".
- Documentation pass (this branch): `docs/components.md`, `design-system.md`, `client-state.md`, `performance.md`, the routing
  table in `AGENTS.md`, `scripts/design-guard.test.ts` and `scripts/contrast-report.js`.

## Deferred

- [Query persistence spike](../backlog/2026-10-25-query-persistence-spike.md)
- [Auth and session store](../backlog/2026-10-25-auth-session-store.md)
- [Chat streaming](../backlog/2026-10-25-chat-streaming.md)
- [Per-tab ErrorBoundary](../backlog/2026-10-25-per-tab-error-boundary.md)
- [Production-env build check](../backlog/2026-10-25-production-env-build-check.md)
- [Image-row list performance on a device](../backlog/2026-10-25-image-row-perf-on-device.md)
- [First-frame theme flash in a release build](../backlog/2026-10-25-release-first-frame-theme-flash.md)
- [Design-system findings](../backlog/2026-10-25-design-system-findings.md) (contrast and Input touch target, found while
  documenting)
- Also open, not backlogged: placeholder app icon and splash; pnpm 12 on EAS images unverified until the first `eas build`.

## Next

Start the first real feature (energy readings, dashboard summary) as `src/features/<name>` following
`docs/architecture.md`, and read the routing table in `AGENTS.md` for the docs that apply. First commands:
`pnpm check`, `pnpm format:check`, `npx expo-doctor` on a clean checkout to confirm the baseline.
