# HANDOFF — wattprint-expo (written 2026-10-25, before session compaction)

Read this first after a compaction. It is the single source of truth for goals, rules, state and next steps. Update it as goals move (keep it short; details live in specs/plans/reports).

## Product and stack
Expo SDK 58 / RN 0.88 base for a future app: **energy tracking + dashboard + chatbot**. Android only for now. Backend: **external FastAPI** (no Expo `+api` routes). Test API for data-fetching experiments: **dummyjson.com**.
Stack in the repo: Expo Router (typed routes, Native Tabs), Uniwind (Tailwind v4) + gluestack v5 (hand-copied components), TanStack Query/Form/Pacer, Zustand + MMKV, expo-secure-store, i18next (en, vi), Zod env, jest-expo + RNTL, ESLint/Prettier/Husky/commitlint, EAS config, GitHub Actions CI. See README.md and AGENTS.md for the rules (they are binding).
Repo: `D:\Dev_Projects\wattprint-expo`, origin `https://github.com/daFoggo/wattprint-expo` (branch `main` pushed). Reference-only project (never copy): `D:\Dev_Projects\noi-that-khanh-linh` (Next.js monorepo with feature slices).

## User rules (standing, 2026-10-25)
- Full permission to act; do NOT ask for permission. If blocked, propose a way and keep going; report in a note at the end. The user sleeps: work autonomously until the goals are met.
- Follow the superpowers workflow (brainstorming -> design doc -> writing-plans -> subagent-driven-development; fresh subagent per task + task review + final review; fix wave once). The user opted out of questions: record my calls in the design docs as "my calls".
- Model convention (global CLAUDE.md): plan/design -> `planner` (Opus); code -> `implementer` (Sonnet); review -> `reviewer` (Opus); exploration/logs -> `scout`/`runner`. Always pass `model` explicitly. Never use Fable models.
- Debug device: **Android emulator `Medium_Phone_API_37.0` ONLY** (`emulator-5554`, app id `com.dafoggo.wattprint.dev`). NEVER use the physical phone (Pixel 8a `3C081JEKB17021`, may stay attached): no adb against it, no installs. Always `adb -s emulator-5554 ...`. Restart emulator: `Start-Process "$env:ANDROID_HOME\emulator\emulator.exe" -ArgumentList '-avd','Medium_Phone_API_37.0','-no-snapshot-save'`.
- Progress tracking rule (IMPORTANT): if a subagent task runs longer than ~5-10 min, check REAL evidence (git log, newest files in the scratchpad/log timestamps, processes, adb) instead of waiting. Known trap: `expo run:android` / `expo start` never exit (Metro); an agent "waiting on background work" for that is stuck. Tell it to proceed and kill Metro (listener on :8081). Never block on non-terminating processes.
- Evidence over claims: run commands, show results; benchmark before claiming "fast".
- Compact the session after finishing a goal chunk (the user asked): the harness auto-compacts; I cannot run `/compact` myself, so keep this file current so nothing is lost.

## Goals and status
- **G1 DONE** (see below) — was: branch fix/uniwind-native-compat; implementer ran (report at `.superpowers/sdd/uniwind-fix/report.md` when done; audit at `.superpowers/sdd/uniwind-fix/audit.md`). Finish: independent review (Opus) -> merge to `main` -> push. Root cause: Uniwind silently ignores web-only variants (`placeholder:`, `hover:`, `web:`, ...) and non-style colour props need `*ClassName="accent-..."`; a guard test now scans `src/**/*.tsx`.
- **G2 Research data fetching / caching / routing / base-project concepts** (with the Next repo as reference for "what a complete base needs"; use Expo skills `expo-data-fetching`, `expo-router`, `expo-project-structure`, `expo-overview`, etc.). Deliver a research doc in `docs/superpowers/specs/` (verified vs opinion, URLs).
- **G3 Validate what was already built with the Expo skills** (project structure, router, data fetching, native UI/design system, dev client, EAS) and fix real gaps via the superpowers flow.
- **G4 Benchmarks** (speed): measure list/fetch/cache/startup behaviour with dummyjson (e.g. TanStack Query caching vs refetch, FlashList vs FlatList on 100-1000 items, cold start, JS bundle size, re-render counts), on the emulator with a release-like build if feasible; web-search where info is missing (Expo/RN perf docs, TanStack Query RN guide). Record numbers and method; avoid the "followed docs wrong" mistakes seen in the Next project (verify against docs + measure).
- **G5 Decide and implement the project architecture** for Expo mobile (feature-based vs layered): previous research (2026-10-25) conclusion — Expo has no official feature-based standard (official guidance is type-based, routes only in `src/app`); feature slices are a community choice and map well from the Next repo minus server parts. Recommendation so far: keep layout until the first real feature, then `src/features/<name>` (components, screens, hooks (TanStack Query + query keys), api (fetch + Zod), schemas, store, types, colocated tests); features must not import `@/app` or other features; shared via `src/components`, `src/lib`; enforce with core `no-restricted-imports` (no new deps); thin routes in `src/app`; backend FastAPI -> OpenAPI-generated types/Zod are worth evaluating. Now the user wants it CONFIRMED by experiments: implement a small trial feature (e.g. products/todos from dummyjson as a throwaway "lab" feature, using the Next repo only as inspiration), measure (G4), then lock the architecture in `docs/architecture.md` + AGENTS.md rules + lint boundaries + tests. Goal quality: scalable, fast, robust, best practice.

## G1 DONE (2026-10-25)
Merged into main and pushed (990c145). Review APPROVED + one fix wave; pnpm check 71 tests, format, expo-doctor 20/20 green; CI on 0850acb was green. Device tests T1-T6 passed on emulator (T4 first-frame flash inconclusive in dev build). Nav theme colours from tokens: done on `feat/data-foundation` (`src/hooks/use-nav-theme.ts`).

## G2/G3/G5 research DONE; execution in flight
Spec (binding): docs/superpowers/specs/2026-10-25-data-architecture-design.md (decision, gaps, rules, lab feature, benchmark method, execution steps 1-8). Branch `feat/data-foundation` for steps 1-4 (implementer), then lab (5), benchmarks (6), lock docs (7), persistence decision (8). Review each wave with one Opus reviewer; merge, push, check CI; update this file after each step.

## Order of work
1) Finish G1 (review, merge, push, update this file). 2) Commit this HANDOFF on main. 3) Compact. 4) G3 validate with skills -> G2 research -> G5 design (spec, my calls) -> plan (writing-plans) -> subagent-driven execution incl. trial feature -> G4 benchmarks -> lock architecture -> final review -> merge + push -> final note to the user (what was done, decisions/rulings, open items).

## Repo state when written
- `main` pushed at `0850acb` (open items closed). Branch `fix/uniwind-native-compat` has the UI-fix commits (not yet merged/pushed).
- Open items for the owner (README): CI first push result (check Actions: `gh run list --repo daFoggo/wattprint-expo`), `vi` locale accepted, icon/splash are Expo placeholders, pnpm on EAS unverified until first `eas build`.
- App ids: `com.dafoggo.wattprint` (production), `.dev` (local debug), `.preview`. Never run `eas build`/credentials unless asked.

## Environment pitfalls (learned the hard way)
- Windows 260-char path: `LongPathsEnabled=1`, SDK CMake 4.1.2 via plugin `plugins/with-android-cmake-dir.js` (win32 only, on prebuild), `nodeLinker: hoisted`.
- `core.autocrlf=true` globally -> `.gitattributes` forces LF; after `git checkout`/merge that removes tracked files, check the working tree (a merge once deleted the untracked `claude-config-summary.md`; it is git-ignored now and was restored).
- `npx expo install ... -- --dev` misbehaves on Windows: use `pnpm add -D`.
- gluestack CLI forces NativeWind when `android/` exists and installs alpha packages: never run it; components are hand-copied (stable core 5.0.15/utils 5.0.6).
- Skills: installed globally via `npx skills add <repo> --skill '*' -g -y` run in PowerShell (creates Windows junctions in `~/.claude/skills` -> `~/.agents/skills`). Git Bash symlinks are not readable by native Windows tools.
- Bash heredocs containing unbalanced quotes can break the tool: write files with the Write tool.
