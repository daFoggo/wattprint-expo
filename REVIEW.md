# Review instructions

Read by the sdlc reviewer and by any PR review before every review. Keep it under a page.

## What blocks a merge (Must fix)

- Behavior breaks on Android in either theme (light, dark) or either language (en, vi).
- Auth or data: a token in MMKV or in a `EXPO_PUBLIC_*` var, a failed request turned into empty or fallback data,
  HTTP that bypasses `createApiClient` or skips its Zod schema.
- A rule card in `.claude/rules/` is broken.

## Should fix

- New logic in `src/lib`, `src/stores` or a feature `api/schemas/queries` file without a jest case that fails when it breaks.
- A persisted store shape change without `version` and `migrate`.
- A rule, doc and `wattprint-base` skill changed out of step (AGENTS.md Doc maintenance).

## Do not report

- What ESLint, tsc, Prettier, commitlint or the guard tests in `scripts/` enforce: import boundaries, `forwardRef` outside
  `src/components/ui`, hard-coded colours, unsupported Uniwind variants, `react-native-web` imports, broken doc links.
- Vendored: `src/components/ui/**` (upstream gluestack). Generated: `src/uniwind-types.d.ts`, `pnpm-lock.yaml`.

## Cap

- At most five Minor findings; summarize the rest as a count.
