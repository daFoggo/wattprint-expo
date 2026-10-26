# Performance digest

Use for lists, images, startup, re-renders, bundle size, or any claim that something is faster. Full rules:
[docs/performance.md](../../../../docs/performance.md) (the old benchmark data was removed on 2026-10-26).

## Decision matrix

| Need                               | Pattern                                                                                                               |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| List of a few hundred rows or more | FlashList v2; hoist `keyExtractor`, stable `renderItem`; no `key` inside rows; `getItemType` for mixed rows           |
| List around 100 rows               | FlatList is acceptable (opinion; the old comparison was removed)                                                      |
| Row images                         | `expo-image`, `recyclingKey` = stable id, fixed size through classes, state `cachePolicy`                             |
| Lists with inputs                  | `keyboardShouldPersistTaps="handled"`                                                                                 |
| Re-renders                         | No manual `memo`/`useCallback` by habit (React Compiler is on); add only after a Profiler measurement                 |
| Startup                            | No awaiting work or new startup request in the root layout; measure a release build before adding startup work        |
| Logging                            | No new `console.*` in `src`                                                                                           |
| A new dependency                   | Check size with Expo Atlas (relative) and justify it                                                                  |
| A "faster" claim                   | Release build on the phone (emulator only as a labelled fallback), n >= 5 (10 cold start), median with range, caveats |

## Never do

- Judge speed from a dev build or one run; quote a percentage without n and range.
- Put `key` props on FlashList row children, or use `inverted` for the future chat list.
- Persist the whole query cache without measuring hydration.
- Commit `.expo/atlas.jsonl` or the `expo-atlas` dependency from a measurement run.

No number in the doc is ours; the old ones were emulator-relative and removed, and image rows were never measured.
