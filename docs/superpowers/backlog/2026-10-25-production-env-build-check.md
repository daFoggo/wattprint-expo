# Production-env build check

Opened: 2026-10-25. Source: baseline caveats, `docs/architecture.md` "Lab feature".

## Why it matters

The Lab tab trigger is hidden and `[BENCH]` logs are silenced when `EXPO_PUBLIC_APP_ENV=production`, but no build ran with
that value.

## Facts (measured or verified)

- `benchLog` returns early in production; `RootLayout` hides the `lab` trigger with `hidden={hideLab}`
  (verified: `src/lib/bench-log.ts`, `src/app/_layout.tsx`).
- The routes in `src/app/lab` are still bundled and reachable by deep link in production (`docs/architecture.md`).
- The baseline builds used the default env `development` (baseline "Environment"); a production-env build was not built or
  measured.
- `app.config.ts` appends the application id suffix from the env, production has none (`README.md`).

## Ideas (not verified)

- Idea: build locally with `EXPO_PUBLIC_APP_ENV=production npx expo run:android --variant release --no-bundler`; do not run
  `eas build` unless the owner asks (`AGENTS.md`).
- Unverified: whether production should also remove the lab routes from the bundle.

## Start when

Before the first preview or production distribution.

## Done when

On an emulator build with the production env: no Lab tab, no `[BENCH]` lines in `adb logcat -d -s ReactNativeJS:V`,
application id `com.dafoggo.wattprint`, and the result is recorded in a report.

## Docs touched

`docs/architecture.md` (Lab feature), `docs/performance.md` section 1, `README.md` if the identifiers change.
