# HANDOFF: wattprint-expo (refreshed 2026-10-25)

Read this first after a compaction or in a new session. It holds goals, standing rules, state and next steps. Keep it short;
details live in specs, plans, reports and the backlog. Update it when goals move.

## Product and stack

Expo SDK 58 / RN 0.88 base for a future app: **energy tracking, dashboard and chatbot**. Android only for now. Backend: **external
FastAPI** (no Expo `+api` routes). Test API for data-fetching experiments: **dummyjson.com**.

Stack in the repo: Expo Router (typed routes, Native Tabs), Uniwind (Tailwind v4) and gluestack v5 (hand-copied components),
TanStack Query/Form/Pacer, Zustand and MMKV, expo-secure-store, i18next (en, vi), Zod env, jest-expo and RNTL,
ESLint/Prettier/Husky/commitlint, EAS config, GitHub Actions CI. `README.md` and `AGENTS.md` are binding; the docs named in
the `AGENTS.md` routing table are the rules per area.

Repo: `D:\Dev_Projects\wattprint-expo`, origin `https://github.com/daFoggo/wattprint-expo`. Reference-only project (never copy):
`D:\Dev_Projects\noi-that-khanh-linh` (Next.js monorepo with feature slices).

## Standing rules

- Full permission to act; do not ask for permission. If blocked, propose a way and keep going; report in a note at the end. Work
  autonomously until the goals are met.
- Follow the superpowers workflow: brainstorming, design doc, writing-plans, subagent-driven development; a fresh subagent per
  task, a task review, a final review, one fix wave. Record calls the user was not asked about as "my calls" in the design docs.
- Model convention (global `CLAUDE.md`): plan and design go to `planner` (Opus); code to `implementer` (Sonnet); review to `reviewer`
  (Opus); exploration and logs to `scout` or `runner`. Always pass `model` explicitly. Never use Fable models.
- Debug device: **Android emulator `Medium_Phone_API_37.0` only** (`emulator-5554`, app id `com.dafoggo.wattprint.dev`). Never use
  the physical phone (Pixel 8a `3C081JEKB17021`, may stay attached): no adb against it, no installs. Always
  `adb -s emulator-5554 ...`. Restart the emulator:
  `Start-Process "$env:ANDROID_HOME\emulator\emulator.exe" -ArgumentList '-avd','Medium_Phone_API_37.0','-no-snapshot-save'`.
- Progress rule: if a subagent task runs longer than about 5 to 10 minutes, check real evidence (git log, newest files, processes,
  adb) instead of waiting. `expo run:android` and `expo start` never exit (Metro); an agent "waiting on background work" for that is
  stuck. Tell it to proceed and kill Metro (listener on :8081). Never block on non-terminating processes.
- Evidence over claims: run commands, show results; benchmark before claiming "fast" (method: `docs/performance.md` section 8).
- Documentation rule (`AGENTS.md`): change the rule, the doc and the skill in one commit; a spec lists the docs it touches.
- Commits: conventional (commitlint), hooks run (lint-staged, commitlint), never bypass them.

## Gates (implementer brief)

You are the implementer. A task is done only when every gate below ran and you report the real result, including failures.
Run from the repo root on a clean working tree. Remove stray `.claude/worktrees/*` checkouts first: ESLint and Jest scan them (a
second `src/global.css` fails `scripts/config-guard.test.ts`).

| #   | Gate                  | Command                                                  | Pass condition                                                  |
| --- | --------------------- | -------------------------------------------------------- | --------------------------------------------------------------- |
| 1   | Format                | `pnpm format:check`                                      | "All matched files use Prettier code style" (`docs/` is ignored by Prettier) |
| 2   | Lint, types, tests    | `pnpm check`                                             | `eslint --max-warnings 0`, `tsc --noEmit` and `jest --ci` all exit 0 |
| 3   | Expo config           | `npx expo-doctor`                                        | all checks pass                                                 |
| 4   | Emulator (UI, native) | see `AGENTS.md` "Device verification"                    | app relaunched, screenshot taken, `adb logcat -d ReactNativeJS:V *:S` has no `E` lines |
| 5   | Docs                  | routing table in `AGENTS.md`                             | the docs for the area you touched are updated in the same commit |

Guards inside gate 2 (each has self-tests that fail first when you break the rule):

| Test                            | Catches                                                                                      |
| ------------------------------- | -------------------------------------------------------------------------------------------- |
| `scripts/boundaries.test.ts`    | import boundaries (`eslint.boundaries.js`)                                                   |
| `scripts/uniwind-guard.test.ts` | classes Uniwind ignores on native, missing `*ClassName` colour bindings                      |
| `scripts/design-guard.test.ts`  | hex and `rgb()`/`hsl()` literals, `dark:` colour pairs outside `src/components/ui`            |
| `scripts/config-guard.test.ts`  | web imports, NativeWind or template leftovers, Metro and Uniwind wiring                      |
| `scripts/app-identity.test.ts`, `scripts/app-config.test.ts` | application ids per env, `eas.json` assertions            |

Rules for you: stay inside the task; copy the nearest existing file instead of inventing; TDD where possible (test red first);
no new dependency unless the task names it (install with `npx expo install`, see `AGENTS.md`); never run `eas build`.

## Report template

At the end of a chunk of work write `docs/superpowers/reports/YYYY-MM-DD-<topic>.md` (template and rules in
`reports/README.md`): Status, What exists, Review outcome, Decisions and deviations, Deferred (link a `backlog/` file per open
item), Next. Reference report: `reports/2026-10-25-base-and-data-layer.md`.

## Goals and status

- **G1 to G5 done and merged to `main`** (Uniwind native compatibility, data-fetching research, validation with the Expo skills,
  benchmarks, architecture). Details: `reports/2026-10-25-base-and-data-layer.md`.
- **Documentation pass** (branch `docs/base-documentation`): `docs/components.md`, `design-system.md`, `client-state.md`,
  `performance.md`, the routing table in `AGENTS.md`, `scripts/design-guard.test.ts`, reports and backlog folders.
- **Open items** (each a file in `backlog/`): query persistence spike, auth and session store, chat streaming, per-tab
  ErrorBoundary, production-env build check, image-row list performance on a device, first-frame theme flash in a release
  build, design-system findings (contrast, Input touch target).
- Open for the owner (`README.md`): `vi` stays the second locale; app icon and splash are Expo placeholders; pnpm 12.14.0 on EAS
  build images is unverified until the first `eas build`.
- CI: green on `main` (`gh run list --repo daFoggo/wattprint-expo`, checked 2026-10-25).

## Next

Build the first real feature as `src/features/<name>` (see `docs/architecture.md`). Pick the next backlog item only when its
"Start when" is true.

## Environment pitfalls (learned the hard way)

- Windows 260-character path limit: `LongPathsEnabled=1`, SDK CMake 4.1.2 through `plugins/with-android-cmake-dir.js` (win32 only,
  on prebuild), `nodeLinker: hoisted`.
- `core.autocrlf=true` globally, so `.gitattributes` forces LF; after a `git checkout` or merge that removes tracked files, check
  the working tree (a merge once deleted the untracked `claude-config-summary.md`; it is git-ignored now).
- `npx expo install ... -- --dev` misbehaves on Windows: use `pnpm add -D`.
- The gluestack CLI forces NativeWind when `android/` exists and installs alpha packages: never run it; components are hand-copied
  (stable core 5.0.15, utils 5.0.6).
- Skills are installed globally with `npx skills add <repo> --skill '*' -g -y` in PowerShell (Windows junctions from
  `~/.claude/skills` to `~/.agents/skills`). Git Bash symlinks are not readable by native Windows tools. The repo has no
  repo-local skills; the routing table names global ones.
- Bash heredocs with unbalanced quotes can break the tool: write files with the Write tool.
- `docs/` is in `.prettierignore`, so Prettier does not check Markdown there; keep lines near 110 characters by hand.
