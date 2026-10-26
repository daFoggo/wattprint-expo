# Production-env build check

Opened: 2026-10-25. Source: `docs/architecture.md` "Example feature".

## Why it matters

No build ran with `EXPO_PUBLIC_APP_ENV=production`, so the production identity and first frame are unchecked.

## Facts (measured or verified)

- No production-env build was built or checked (benchmark data from earlier builds was removed on 2026-10-26).
- `app.config.ts` appends the application id suffix from the env, production has none (`README.md`).

## Ideas (not verified)

- Idea: build locally with `EXPO_PUBLIC_APP_ENV=production npx expo run:android --variant release --no-bundler`; do not run
  `eas build` unless the owner asks (`AGENTS.md`).

## Start when

Before the first preview or production distribution.

## Done when

On an emulator build with the production env: no `E` lines in `adb logcat -d ReactNativeJS:V *:S`,
application id `com.dafoggo.wattprint`, and the result is recorded in a report.

## Docs touched

`README.md` if the identifiers change.
