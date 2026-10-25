# Performance digest

Use for lists, images, startup, re-renders, bundle size, or any claim that something is faster. Full rules and the measured tables:
[docs/performance.md](../../../../docs/performance.md); raw data in [docs/benchmarks](../../../../docs/benchmarks/2026-10-25-baseline.md).

## Decision matrix

| Need                               | Pattern                                                                                                                                |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| List of a few hundred rows or more | FlashList v2; hoist `keyExtractor`, stable `renderItem`; no `key` inside rows; `getItemType` for mixed rows                            |
| List around 100 rows               | FlatList is acceptable (no measurable difference on the emulator)                                                                      |
| Row images                         | `expo-image`, `recyclingKey` = stable id, fixed size through classes, state `cachePolicy`                                              |
| Lists with inputs                  | `keyboardShouldPersistTaps="handled"`                                                                                                  |
| Re-renders                         | No manual `memo`/`useCallback` by habit (React Compiler is on); add only after a Profiler measurement                                  |
| Startup                            | No awaiting work or new startup request in the root layout; re-run `scripts/bench/cold-start.sh` in a release build                    |
| Logging                            | `benchLog` only; no new `console.*`                                                                                                    |
| A new dependency                   | Check size with Expo Atlas (relative) and justify it                                                                                   |
| A "faster" claim                   | Release build, emulator `Medium_Phone_API_37.0`, n >= 5 (10 cold start), median with range, caveats, raw CSV in `docs/benchmarks/raw/` |

## Never do

- Judge speed from a dev build or one run; quote a percentage without n and range.
- Put `key` props on FlashList row children, or use `inverted` for the future chat list.
- Persist the whole query cache without measuring hydration.
- Commit `.expo/atlas.jsonl` or the `expo-atlas` dependency from a measurement run.

All numbers in the doc are emulator-relative; image rows were never measured on a device.
