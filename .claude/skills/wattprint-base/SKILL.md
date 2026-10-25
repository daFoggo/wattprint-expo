---
name: wattprint-base
description: >
  Use when creating or changing code, styling, data fetching, state, packages or config in the wattprint-expo repo
  (Expo SDK 58, React Native 0.88, Android dev build): features and routes under src/app or src/features, screens,
  components and gluestack-ui parts, Uniwind classes and tokens, colours, dark mode, touch targets, TanStack Query,
  createApiClient, Zod schemas, staleTime, offline, loading/empty/error states, Zustand stores, MMKV, SecureStore,
  FlashList, expo-image, installing a package (expo install, pnpm), forwardRef or ref props, import boundary lint
  errors, emulator checks, or "what is the project convention for X", even when the user does not name the repo.
---

# wattprint-base: conventions and decision router

Fast router for `wattprint-expo` (energy tracking, dashboard, chatbot; external FastAPI backend; Android only).
The Single Source of Truth is `docs/` plus `AGENTS.md` and `README.md`. This skill routes to them and never
restates them: **when this skill and a doc differ, the doc wins**. Change a rule, its doc and this skill in one commit.

## 1. Decision router (what are you doing?)

| Task or intent                                    | Pattern                                                                                           | Digest                                          | Source of truth                                                                                                                                                            |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Add a feature, screen or route                    | Slice `src/features/<name>` (api, schemas, queries, hooks, components, screens); route stays thin | [architecture.md](references/architecture.md)   | [architecture.md#layout](../../../docs/architecture.md#layout)                                                                                                             |
| Lint says an import is forbidden                  | Move code to the right layer; cross-feature composition goes in `src/screens` or a route          | [architecture.md](references/architecture.md)   | [architecture.md#rules](../../../docs/architecture.md#rules)                                                                                                               |
| Call the backend                                  | `api.ts` calls `createApiClient` with a Zod `schema`; throw typed errors                          | [data-fetching.md](references/data-fetching.md) | [data-fetching.md#rules](../../../docs/data-fetching.md#rules)                                                                                                             |
| Query keys, `staleTime`, detail from list         | Key factory in `queries.ts`; per-query `staleTime`; cached list row as `placeholderData`          | [data-fetching.md](references/data-fetching.md) | [data-fetching.md#rules](../../../docs/data-fetching.md#rules)                                                                                                             |
| Loading, empty, error, offline UI                 | `components/states/*` (paused uses `OfflineState`); failed refresh keeps cached data              | [data-fetching.md](references/data-fetching.md) | [design-system.md#state-components](../../../docs/design-system.md#state-components)                                                                                       |
| Query persistence, auth store, chat streaming     | Not decided: read the backlog before designing                                                    | [data-fetching.md](references/data-fetching.md) | [data-fetching.md#not-decided-yet](../../../docs/data-fetching.md#not-decided-yet)                                                                                         |
| Build or extend a component                       | Compound parts, `variant`/`size` in `tva`, children over props; `ref` is a prop                   | [components.md](references/components.md)       | [components.md#3-no-boolean-prop-proliferation-explicit-variants](../../../docs/components.md#3-no-boolean-prop-proliferation-explicit-variants)                           |
| Edit or add a gluestack part                      | Hand-copy from the Uniwind template, stable packages, record the deviation; never the CLI         | [tooling.md](references/tooling.md)             | [components.md#7-react-19-specifics](../../../docs/components.md#7-react-19-specifics)                                                                                     |
| Move a component to shared                        | Only when a second feature needs it and it has a nameable role                                    | [components.md](references/components.md)       | [components.md#8-when-to-extract-a-component](../../../docs/components.md#8-when-to-extract-a-component)                                                                   |
| Colour, dark mode, spacing, type                  | Semantic tokens from `src/global.css`; no hex, `rgb()`, palette or `dark:` pairs                  | [design-system.md](references/design-system.md) | [design-system.md#1-tokens](../../../docs/design-system.md#1-tokens)                                                                                                       |
| Class has no effect on device                     | Uniwind dropped an unsupported variant or a non-style colour prop needs `*ClassName`              | [design-system.md](references/design-system.md) | [README.md#uniwind-native-rules](../../../README.md#uniwind-native-rules)                                                                                                  |
| Third-party component needs `className`           | `withUniwind` once in one file, then reuse                                                        | [design-system.md](references/design-system.md) | [components.md#8-when-to-extract-a-component](../../../docs/components.md#8-when-to-extract-a-component)                                                                   |
| Touch targets, labels, live regions, font scaling | 48 dp minimum; roles and labels; `min-h-*` on text                                                | [design-system.md](references/design-system.md) | [design-system.md#5-android-rules](../../../docs/design-system.md#5-android-rules)                                                                                         |
| Animation or reduced motion                       | Opacity and transform only, short; reduced motion is an open doubt                                | [design-system.md](references/design-system.md) | [design-system.md#7-motion](../../../docs/design-system.md#7-motion)                                                                                                       |
| Where does this state live                        | Query cache, route param, `useState`, Zustand + MMKV, or SecureStore: pick the first row          | [client-state.md](references/client-state.md)   | [client-state.md#1-the-homes-of-state](../../../docs/client-state.md#1-the-homes-of-state)                                                                                 |
| New or changed Zustand store, persist, logout     | `src/stores/<name>-store.ts`, `version` + `migrate`, `reset()` for user-scoped state              | [client-state.md](references/client-state.md)   | [client-state.md#4-persistence](../../../docs/client-state.md#4-persistence)                                                                                               |
| Long list, images, startup, bundle size           | FlashList for hundreds of rows; `expo-image` with `recyclingKey`; measure in release              | [performance.md](references/performance.md)     | [performance.md#2-lists](../../../docs/performance.md#2-lists)                                                                                                             |
| "It is faster" claim                              | Release build, n >= 5, median and range, caveats                                                  | [performance.md](references/performance.md)     | [performance.md#8-release-build-measurement-method-checklist-for-a-perf-claim](../../../docs/performance.md#8-release-build-measurement-method-checklist-for-a-perf-claim) |
| Install or upgrade a package, run the CLI         | `npx expo install`; Windows dev deps with `pnpm add -D`; exact gluestack pins                     | [tooling.md](references/tooling.md)             | [AGENTS.md#code-rules](../../../AGENTS.md#code-rules)                                                                                                                      |
| Read an env var                                   | Static `process.env.EXPO_PUBLIC_X` in `src/env.ts`; never a secret                                | [tooling.md](references/tooling.md)             | [README.md#environment](../../../README.md#environment)                                                                                                                    |
| Finish a task, verify on a device                 | `pnpm check`, `pnpm format:check`, `npx expo-doctor`, emulator screenshot and logcat              | [tooling.md](references/tooling.md)             | [AGENTS.md#device-verification](../../../AGENTS.md#device-verification)                                                                                                    |
| Change a rule or a doc                            | Rule, doc, skill and `README.md` in one commit; docs links test must pass                         | [tooling.md](references/tooling.md)             | [AGENTS.md#doc-maintenance](../../../AGENTS.md#doc-maintenance)                                                                                                            |

## 2. Golden rules (each one has a guard or a doc section)

1. **Doc first.** Open the doc for the area before editing ([routing table](../../../AGENTS.md#read-the-doc-before-changing-the-area)).
2. **Feature slices.** A feature never imports `@/app`, `@/screens`, another feature or `../`. Duplicate until a second feature needs it
   (`eslint.boundaries.js`, `scripts/boundaries.test.ts`).
3. **Throw, never fake.** All HTTP goes through `createApiClient` with a Zod schema; failures are `ApiError`, `NetworkError` or
   `ContractError`, never fallback data. The query default `staleTime` is 30 s; never default it to 0.
4. **Tokens only.** Colour comes from semantic tokens; Uniwind silently drops unsupported variants (`placeholder:`, `hover:`,
   `focus-visible:`, `web:`, `group-*`) (`scripts/design-guard.test.ts`, `scripts/uniwind-guard.test.ts`).
5. **Own components use `ref` as a prop**, never `forwardRef` or `useContext`; vendored `src/components/ui/**` keeps upstream.
   Pick `variant` or `size`, never call-site size or colour overrides, never boolean look props.
6. **48 dp touch targets.** `Button` enforces it; `Input` is a known gap (`min-h-9`) recorded in the backlog.
7. **Packages.** `npx expo install <pkg>`; `pnpm add -D` for dev deps on Windows; keep the gluestack pins; never run
   `gluestack-ui add` or `init`; no alpha components.
8. **State has one home.** Query data is not store state; no tokens in MMKV; one store per concern.
9. **Done means evidence.** Run the gates and report real output, failures included. Never `eas build` unasked.
10. **Doc, rule and skill change together**, and `scripts/docs-links.test.ts` keeps every link and path real.

## 3. Doc index

- [AGENTS.md](../../../AGENTS.md): code rules, routing table, device verification, EAS; [README.md](../../../README.md): setup, decisions, deviations.
- [docs/architecture.md](../../../docs/architecture.md): feature slices, layout, import rules.
- [docs/data-fetching.md](../../../docs/data-fetching.md): client, errors, query defaults, lists, open decisions.
- [docs/components.md](../../../docs/components.md): compound parts, variants, React 19, vendored exceptions, extraction.
- [docs/design-system.md](../../../docs/design-system.md): tokens, contrast, type, spacing, Android, component usage, motion, a11y.
- [docs/client-state.md](../../../docs/client-state.md): homes of state, Zustand and MMKV, persist, logout, tests.
- [docs/performance.md](../../../docs/performance.md): lists, images, startup, Hermes, bundle, measurement method.
- [docs/superpowers/HANDOFF.md](../../../docs/superpowers/HANDOFF.md): goals, standing rules, gates; `backlog/` holds open items.

Evals for this skill: [evals/evals.json](evals/evals.json).
