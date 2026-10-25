# Client state digest

Use when state is needed beyond one component, or a store, persistence, logout or secret storage is involved. Full rules:
[docs/client-state.md](../../../../docs/client-state.md).

## Decision matrix (first row that fits)

| State is                                            | Home                                                     |
| --------------------------------------------------- | -------------------------------------------------------- |
| Backend data                                        | TanStack Query cache; never copied into a store          |
| Which item or filter a screen shows (deep-linkable) | Route params (strings; parse at the screen edge)         |
| Draft or toggle for one component tree              | `useState` / `useReducer`; TanStack Form for form fields |
| Preference that survives restarts, read by screens  | Zustand + MMKV in `src/stores/<name>-store.ts`           |
| Secret (refresh token, API key)                     | `expo-secure-store`, small values only; never MMKV       |

## Store recipe

Model: `src/stores/preferences-store.ts`. Curried `create<State>()(persist(...))`; `name`, `storage: createJSONStorage(() => zustandStorage)`,
`version`, `partialize`; actions are verbs and change client state only. One store per concern. A module-level store is correct here
(no SSR). Read one primitive per selector; an object selector needs `useShallow` from `zustand/react/shallow`. Outside React use
`useXStore.getState()`. Only `src/lib/storage.ts` imports `react-native-mmkv`.

## Persist traps

- Changed the persisted shape: bump `version`. Same version, new shape: old data is shallow-merged silently.
- Bumped `version` without `migrate`: stored state is dropped and a `console.error` shows up as an `E ReactNativeJS` line.
- `migrate` runs only on a version change; validate stored data in `merge`.
- A user-scoped store exposes `reset()`; logout resets it, clears its storage key and calls `queryClient.clear()`. Device-scoped state stays.

## Tests

Reset both `storage.clearAll()` and `setState(initial)` in `beforeEach`; assert the persisted `{ state, version }` envelope; RNTL 14 is async.
After a persisted shape change, force-stop and relaunch on the emulator and read logcat.
