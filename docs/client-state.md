# Client state

Where each kind of state lives in this app and how to build a Zustand store. Written 2026-10-25 against
Zustand 5.0.16, react-native-mmkv 4.3.2 (with `react-native-nitro-modules` 0.37.1), `@tanstack/react-query` 5.104.5,
expo-router 58.0.26, expo-secure-store 58.0.2, React 19.3.0. Related: [architecture.md](architecture.md) (where store files go),
[data-fetching.md](data-fetching.md) (server data), [components.md](components.md) (context vs store for compound
components), [design-system.md](design-system.md) (the theme preference), [performance.md](performance.md).

Labels: **(verified: ...)** names the file, command or URL checked. **(opinion)** is our choice, not proven.
Persist behaviour below was read from the installed source (`node_modules/zustand/esm/middleware.mjs`) and types
(`node_modules/zustand/middleware/persist.d.ts`), not from memory.

## 1. The homes of state

Pick the first row that fits.

| State is...                                                       | Home                                 | In this repo                                                                  |
| ----------------------------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------- |
| Data owned by the FastAPI backend                                 | TanStack Query cache                 | a feature's `<feature>/queries.ts` (no feature has one yet; the mock slices do not call a backend); never copy it into a store |
| Which item or filter a screen shows, and must survive a deep link | Route params, `useLocalSearchParams` | a `[id]` route reading `useLocalSearchParams` (no example in the repo since 2026-10-26) |
| Draft or toggle used by one component tree                        | `useState` / `useReducer`            | `showModal` in `src/screens/settings/index.tsx`; TanStack Form for form fields (`sample-form.tsx`); lifted: `DeviceStatesProvider` in `src/features/devices/device-states.tsx`, mounted above `NativeTabs` in `src/app/(app)/_layout.tsx` so Home and Devices share one `useState` (verified: those files) |
| Client preference that must survive app restarts, read by several screens | Zustand + MMKV              | `src/stores/preferences-store.ts` (theme)                                    |
| Secret (refresh token, API key)                                   | `expo-secure-store`                  | the Better Auth session (cookie, via `expoClient`) in `src/lib/auth-client.ts` (verified: file); base-check in `src/screens/settings/index.tsx` |

Notes:

- **Query data is not store state.** The cache is the cache; a store that mirrors a query goes stale and doubles
  memory (opinion; consistent with [data-fetching.md](data-fetching.md)).
- **Route params are strings** (or string arrays); parse them at the screen edge, for example with `Number(id)` and an
  invalid-id state (the removed example feature did this).
- **SecureStore** keeps values in Android `SharedPreferences` encrypted with the Keystore; Android data is not
  preserved on uninstall; `getItem`/`setItem` (sync) block the JS thread, `*Async` do not; Expo sets no size limit but
  some iOS releases rejected values above about 2048 bytes
  (verified: <https://docs.expo.dev/versions/latest/sdk/securestore/>). Use it for small secrets only.
- **MMKV is not a secure store.** `createMMKV` accepts an optional `encryptionKey` and we pass none
  (verified: `node_modules/react-native-mmkv/src/specs/MMKVFactory.nitro.ts`, `src/lib/storage.ts`). Never put tokens in
  a persisted store (opinion).

## 2. Where code lives

```
src/lib/storage.ts            MMKV instance (`storage`, id 'app-storage') and the Zustand `StateStorage` adapter
src/stores/<name>-store.ts    app-wide store, colocated <name>-store.test.ts
src/features/<name>/store.ts  store that only one feature uses (docs/architecture.md)
```

Boundaries (verified: `AGENTS.md`, `eslint.boundaries.js`): `stores` never imports `components`, `features`, `screens` or `app`;
a feature never imports another feature or `@/app`, so state two features share belongs in `src/stores` or is composed in
`src/screens`. A store file has no JSX and no UI imports. Components read the store through the hook.

`src/lib/storage.ts` is the only file that imports `react-native-mmkv` (verified: `grep react-native-mmkv src`); keep it that way
so tests mock one place.

## 3. Creating a store

Model: `src/stores/preferences-store.ts` (verified).

```ts
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { zustandStorage } from '@/lib/storage';

export type ThemePreference = 'system' | 'light' | 'dark';

type PreferencesState = {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
};

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'preferences', storage: createJSONStorage(() => zustandStorage) },
  ),
);
```

Conventions (opinion unless labelled):

- Curried `create<State>()(...)` for the TypeScript middleware typing; state and actions in one type; actions are verbs
  (`setTheme`), and they only change client state. Server writes are TanStack mutations
  ([data-fetching.md](data-fetching.md)).
- One store per concern, named `use<Name>Store` in `<name>-store.ts`. Do not build one global store.
- Keep the stored shape small and serialisable (no functions, no class instances, no `Date`).

### Selectors and `useShallow`

Read one primitive per call: `usePreferencesStore((s) => s.theme)` (verified: `_layout.tsx`, `use-nav-theme.ts`, `screens/settings/index.tsx`).
Selecting an object or array that is rebuilt on every call (`(s) => ({ a: s.a, b: s.b })`) returns a new reference each time,
so wrap it in `useShallow` from `zustand/react/shallow` (verified: exported by `node_modules/zustand/react/shallow.d.ts`,
signature `useShallow(selector)`). Do not subscribe to the whole store (`usePreferencesStore()`) in a component that
needs one field. No component in `src` uses `useShallow` today, because no selector builds an object.
Outside React (a module that runs before render), use `useXStore.getState()`, as `src/app/_layout.tsx` does to call
`Uniwind.setTheme(usePreferencesStore.getState().theme)` before the first render (verified).

## 4. Persistence

`persist` options, as typed in the installed Zustand 5.0.16 (verified: `zustand/middleware/persist.d.ts`):

| Option                 | Meaning in the installed source                                                                 |
| ---------------------- | ----------------------------------------------------------------------------------------------- |
| `name`                 | Unique storage key. Required.                                                                   |
| `storage`              | `createJSONStorage(() => zustandStorage)`; our adapter wraps MMKV (`getString`, `set`, `remove`) |
| `partialize`           | Choose the fields to save; default saves the whole state (actions are dropped by JSON)          |
| `version`              | Number, default `0`                                                                             |
| `migrate`              | Called with `(persistedState, storedVersion)` when the stored version differs                   |
| `merge`                | Combines stored and current state; default is a shallow merge                                   |
| `onRehydrateStorage`   | Callback before and after hydration; receives `(state, error)` afterwards                       |
| `skipHydration`        | Default `false`; if `true`, call `store.persist.rehydrate()` yourself                           |

Behaviour read from `zustand/esm/middleware.mjs`:

- **Same `version`, different shape:** nothing detects it; the default `merge` shallow-merges the old stored object into the
  new state silently (missing or stale keys, wrong types). This is why a shape change must bump `version`, and why reads
  need validation in `merge`.
- **Version mismatch without `migrate`:** the stored state is not used, the store keeps its initial state and
  `console.error("State loaded from storage couldn't be migrated since no migrate function was provided")` is logged.
  That is a `console.error`, so it shows as an `E ReactNativeJS` line in the device check
  ([AGENTS.md](../AGENTS.md) "Device verification").
- **With `migrate`:** the returned state is merged and written back immediately.
- **Corrupt JSON:** `JSON.parse` throws inside `createJSONStorage().getItem`; the hydration chain catches it and calls
  `onRehydrateStorage`'s inner callback with the error. The store stays at its initial state. Nothing else reports it.
- **Hydration is synchronous with a synchronous storage:** `hydrate()` runs the chain through `toThenable`, which only
  becomes async when `getItem` or `migrate` returns a `Promise`. MMKV reads are synchronous, so the persisted theme is
  in the store when the module finishes loading; this is why `_layout.tsx` can call `Uniwind.setTheme` before the first render
  (verified: `toThenable` and `hydrate` in `zustand/esm/middleware.mjs`; behaviour relied on by the root layout).

The official page recommends a custom storage that validates data (for example with Zod) because the default does no
runtime validation (verified: <https://zustand.docs.pmnd.rs/reference/middlewares/persist>).

**Current state of our store:** `preferences-store` sets only `name` and `storage`: no `version`, `partialize` or `migrate`
(verified: file). It stores one string and the stored value is not validated on read, so an unexpected `theme` string would pass
through to `Uniwind.setTheme`. That is acceptable for a three-value preference today. When its shape changes, set `version: 1`
and add a `migrate` for the upgrade (opinion); a changed shape under the same version is not detected (see the next list).
A new persisted store should start with:

```ts
{
  name: 'cart',
  version: 1,
  storage: createJSONStorage(() => zustandStorage),
  partialize: (state) => ({ items: state.items }), // never persist actions or transient flags
  // Validation belongs in `merge` (or in the storage adapter): keep valid fields, fall back to the defaults.
  merge: (persisted, current) => ({ ...current, ...(cartSchema.safeParse(persisted).data ?? {}) }),
  // `migrate` is only for upgrading an older stored shape; it runs when the stored version differs.
  migrate: (persisted, version) => (version === 0 ? upgradeCartV0(persisted) : persisted),
}
```

Rules for persisted stores (opinion): persist preferences and small user choices only; never tokens (SecureStore) or server
data (query cache); bump `version` on every shape change and write a `migrate` that upgrades the old shape; validate what
you read from storage in `merge` (or a validating storage adapter) with a Zod schema, and treat a failed parse as "start from
the default".

## 5. Native specifics

- **No SSR, so a module-level store is fine.** There is no server render to leak state between requests; the Next-style
  store-per-request provider does not apply (opinion, from the platform: the app is a single JS runtime per process).
- **Screens stay mounted.** React Navigation does not unmount screens when you navigate away, in stack and tab navigators;
  only a popped stack screen unmounts (verified: <https://reactnavigation.org/docs/navigation-lifecycle/>). A
  `useState` on a tab screen therefore survives switching tabs (an earlier emulator measurement of 0 renders on switching
  back was removed and not repeated). State is lost when the screen is popped,
  on `router.replace`, or when the process dies. If it must outlive that, it is a route param or a persisted store.
- **MMKV under Jest** is an in-memory implementation chosen by the library, with `react-native-nitro-modules` mocked in
  `jest.setup.ts` (verified: `jest.setup.ts`, `src/lib/storage.test.ts`).
- **App restarts** reread MMKV; background process death is the same as a restart.
- **Device verification:** after changing a persisted store, force-stop and relaunch the app to prove the value survives, and
  read logcat for the migration `console.error` above.

## 6. Logout and user-scoped state

Auth is Better Auth (spec `docs/superpowers/specs/2026-10-30-better-auth-integration-design.md`). The session lives in
SecureStore, written by `expoClient` (`src/lib/auth-client.ts`); there is no Zustand session store, the route guard reads
`authClient.useSession()` in `src/app/_layout.tsx`. The JWT for FastAPI is held in memory only by `createTokenProvider`
(`src/lib/auth-token.ts`) and is never persisted or logged. Sign-out is `signOutAndClear` (`src/lib/session.ts`): remote
sign-out, drop the cached JWT and `queryClient.clear()`, the last two even when the remote call fails (verified:
`src/lib/session.test.ts`). No user-scoped Zustand store exists yet. The rule for any store added later:

| Store scope                     | On logout                                                                             |
| ------------------------------- | ------------------------------------------------------------------------------------- |
| Device-scoped (theme, locale)   | Keep. `preferences` is device scoped.                                                 |
| User-scoped (session, drafts)   | Reset to initial state and remove its storage key.                                    |
| TanStack Query cache            | `queryClient.clear()` (typed in `@tanstack/query-core`; verified: `QueryClient.clear(): void`) |

A user-scoped store exposes `reset: () => set(useXStore.getInitialState())` (verified: `getInitialState` is in the
vanilla store API, `node_modules/zustand/vanilla.d.ts`) and a logout function calls every `reset`, then
`useXStore.persist.clearStorage()` for persisted ones, then clears the query cache (opinion). Add a test per store that
proves the reset.

## 7. Testing and resetting

Pattern from `src/stores/preferences-store.test.ts` (verified):

```ts
beforeEach(() => {
  storage.clearAll(); // MMKV in-memory under Jest
  usePreferencesStore.setState({ theme: 'system' }); // back to the initial state
});

it('persists theme to MMKV', () => {
  usePreferencesStore.getState().setTheme('dark');
  expect(JSON.parse(zustandStorage.getItem('preferences') as string).state.theme).toBe('dark');
});
```

- Test the store through `getState()` and `setState()`, not through a component, unless a component's selector is the
  subject.
- Assert what was persisted by reading `zustandStorage.getItem(name)` and parsing; the stored envelope is
  `{ state, version }`.
- Reset in `beforeEach` with both `storage.clearAll()` and `setState(initial)`; the store is a module singleton and keeps its
  state across tests in one file.
- To test hydration or migration, write a JSON envelope into `storage` first, then `await store.persist.rehydrate()`.
  Not done in the repo yet (no store has a migration).
- RNTL 14 is async: `await render`, `await act` (verified: `README.md` "Jest setup").

## Checklist

- [ ] The state has the right home from section 1; query data is not in a store.
- [ ] Store in `src/stores` or `src/features/<name>/store.ts`; no UI imports; boundaries lint passes.
- [ ] Components select one value (or use `useShallow` for an object); none read the whole store.
- [ ] Persisted store: `name`, `version`, `partialize`, `migrate` for upgrades, validation in `merge`; no secrets.
- [ ] A user-scoped store has `reset()` and is cleared on logout; a test proves it.
- [ ] Colocated test resets MMKV and the store in `beforeEach` and asserts the persisted envelope.
- [ ] Relaunched on the phone and checked logcat for `E ReactNativeJS` after a persisted shape change.

## Anti-patterns

- Copying query results into a store with an effect (`useEffect(() => setItems(data))`).
- Persisting tokens or large lists in MMKV.
- `const store = useXStore()` in a component (re-renders on every change) or `(s) => ({ a: s.a })` without `useShallow`.
- Changing a persisted shape without bumping `version`: the old stored shape is shallow-merged silently. Bumping `version`
  without a `migrate`: the stored value is dropped and a `console.error` is logged.
- Validating stored data inside `migrate`; it only runs on a version change. Use `merge` or a validating storage adapter.
- Importing `react-native-mmkv` outside `src/lib/storage.ts`.
- A store that imports a component, a screen or another feature.
- Putting a Next-style store provider around the app "for SSR safety"; there is no SSR here.
- Clearing MMKV (`storage.clearAll()`) in tests without resetting the stores' in-memory state, or the reverse: other stores
  and keys are left inconsistent. Reset both, as the pattern in section 7 does.

## Sources

- Our code: `src/stores/preferences-store.ts`, `src/lib/storage.ts`, `src/app/_layout.tsx`, `src/hooks/use-nav-theme.ts`,
  `jest.setup.ts`.
- Zustand persist reference: <https://zustand.docs.pmnd.rs/reference/middlewares/persist>; installed source
  `node_modules/zustand/esm/middleware.mjs` and `zustand/middleware/persist.d.ts`.
- React Navigation lifecycle: <https://reactnavigation.org/docs/navigation-lifecycle/>.
- SecureStore: <https://docs.expo.dev/versions/latest/sdk/securestore/>.
- Design for the session store: `docs/superpowers/specs/2026-10-25-data-architecture-design.md`.
