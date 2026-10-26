---
name: wattprint-base
description: >
  Use when creating or changing code, styling, data fetching, state, packages or config in the wattprint-expo repo
  (Expo SDK 58, React Native 0.88, Android dev build): features and routes under src/app or src/features, screens,
  components and gluestack-ui parts, Uniwind classes and tokens, colours, dark mode, touch targets, TanStack Query,
  createApiClient, Zod schemas, staleTime, offline, loading/empty/error states, Zustand stores, MMKV, SecureStore,
  FlashList, expo-image, installing a package (expo install, pnpm), forwardRef or ref props, import boundary lint
  errors, device checks on the phone, or "what is the project convention for X", even when the user does not name the repo.
---

# wattprint-base: conventions and decision router

Router for `wattprint-expo` (energy tracking, dashboard, chatbot; external FastAPI backend; Android only). The source of truth
is `docs/`, `AGENTS.md` and `README.md`; the digests here summarise them and **the doc wins** when they differ. Change a rule,
its doc and this skill in one commit.

## 1. Decision router

Read the digest for the pattern, then the doc section for the rule and the reason.

<!-- prettier-ignore -->
| Task | Pattern | Read |
| --- | --- | --- |
| Add a feature, screen or route | Slice `src/features/<name>`; thin route | [digest][arch] / [doc][arch-layout] |
| Lint forbids an import | Fix the layer; compose features in `src/screens` | [digest][arch] / [doc][arch-rules] |
| Call the backend, query keys, `staleTime` | `<feature>/api.ts`, `createApiClient`, Zod; typed errors | [digest][data] / [doc][data-rules] |
| Loading, empty, error, offline UI | `components/states/*`; keep cached data on refresh error | [digest][data] / [doc][ds-states] |
| Query persistence, auth store, chat streaming | Not decided: read the backlog first | [digest][data] / [doc][data-open] |
| Build or extend a component | Compound parts, `variant`/`size`, `ref` as a prop | [digest][comp] / [doc][comp-variants] |
| Edit or add a gluestack part | Hand-copy, stable pins, note deviation; never the CLI | [digest][tool] / [doc][comp-vendored], [README][decisions] |
| Move a component to shared | Only when a second feature needs it | [digest][comp] / [doc][comp-extract] |
| Colour, dark mode, spacing, type | Tokens from `src/global.css`; green text and Button fills use `primary-strong`; Input is a filled field | [digest][ds] / [doc][ds-tokens] |
| Class has no effect on device | Unsupported variant, or `*ClassName` binding missing | [digest][ds] / [README][uniwind] |
| Third-party component needs `className` | `withUniwind` once in one file | [digest][ds] / [doc][comp-extract] |
| Touch targets, labels, live regions | 48 dp minimum; roles and labels; `min-h-*` on text | [digest][ds] / [doc][ds-android] |
| Animation, reduced motion | Opacity and transform; reduced motion unverified | [digest][ds] / [doc][ds-motion] |
| Where state lives | First fitting home; query data is never a store | [digest][state] / [doc][state-homes] |
| New Zustand store, persist, logout | `src/stores/<name>-store.ts`; `version`, `migrate` | [digest][state] / [doc][state-persist] |
| Long list, images, startup, bundle size | FlashList from hundreds of rows; `recyclingKey` | [digest][perf] / [doc][perf-lists] |
| A "faster" claim | Release build, n >= 5, median, range, caveats | [digest][perf] / [doc][perf-method] |
| Install or upgrade a package | `npx expo install`; `pnpm add -D` for dev deps | [digest][tool] / [AGENTS][agents-code] |
| Env var | Static `process.env.EXPO_PUBLIC_X`; never a secret | [digest][tool] / [README][env] |
| Finish a task | All gates, phone screenshot and logcat | [digest][tool] / [AGENTS][agents-device] |
| Change a rule or a doc | One commit; docs-links test passes | [digest][tool] / [AGENTS][agents-maint] |

## 2. Golden rules (each has a guard or a doc section)

1. **Doc first.** Open the doc for the area before editing ([routing table][agents-route]).
2. **Feature slices.** A feature never imports `@/app`, `@/screens`, another feature or `../`; duplicate until a second feature
   needs it (`eslint.boundaries.js`, `scripts/boundaries.test.ts`).
3. **Throw, never fake.** HTTP only through `createApiClient` with a Zod schema; failures are `ApiError`, `NetworkError` or
   `ContractError`, never fallback data. Default `staleTime` is 30 s; never default it to 0.
4. **Tokens only.** Colour from semantic tokens; Uniwind silently drops unsupported variants (`placeholder:`, `hover:`,
   `focus-visible:`, `web:`, `group-*`). Custom bordered controls use `border-input`, `border-border` is for dividers; green text and Button fills use `primary-strong` (`primary` is for shapes)
   (`scripts/design-guard.test.ts`, `scripts/uniwind-guard.test.ts`, `scripts/contrast.test.ts`).
5. **Own components take `ref` as a prop**, never `forwardRef` or `useContext`; vendored `src/components/ui/**` keeps upstream.
   Use `variant` or `size`, never call-site size or colour overrides, never boolean look props.
6. **48 dp touch targets.** `Button` and `Input` enforce `min-h-12`; `InputSlot` has no minimum size.
7. **Packages.** `npx expo install <pkg>`; `pnpm add -D` for dev deps on Windows; keep the gluestack pins; never run
   `gluestack-ui add` or `init`; no alpha components.
8. **State has one home.** Query data is not store state; no tokens in MMKV; one store per concern.
9. **Done means evidence.** Run the gates, report real output, failures included. Never `eas build` unasked.
10. **Doc, rule and skill change together**; `scripts/docs-links.test.ts` keeps links and paths real.

## 3. Doc index

[AGENTS.md][agents] (code rules, routing table, device checks, EAS), [README.md][readme] (setup, decisions, deviations),
[architecture][arch-doc], [data-fetching][data-doc], [components][comp-doc], [design-system][ds-doc],
[client-state][state-doc], [performance][perf-doc], [HANDOFF][handoff] (goals, standing rules, gates; `backlog/` holds
open items). Evals: [evals/evals.json](evals/evals.json).

[arch]: references/architecture.md
[data]: references/data-fetching.md
[comp]: references/components.md
[ds]: references/design-system.md
[state]: references/client-state.md
[perf]: references/performance.md
[tool]: references/tooling.md
[arch-doc]: ../../../docs/architecture.md
[data-doc]: ../../../docs/data-fetching.md
[comp-doc]: ../../../docs/components.md
[ds-doc]: ../../../docs/design-system.md
[state-doc]: ../../../docs/client-state.md
[perf-doc]: ../../../docs/performance.md
[handoff]: ../../../docs/superpowers/HANDOFF.md
[agents]: ../../../AGENTS.md
[readme]: ../../../README.md
[arch-layout]: ../../../docs/architecture.md#layout
[arch-rules]: ../../../docs/architecture.md#rules
[data-rules]: ../../../docs/data-fetching.md#rules
[data-open]: ../../../docs/data-fetching.md#not-decided-yet
[comp-variants]: ../../../docs/components.md#3-no-boolean-prop-proliferation-explicit-variants
[comp-vendored]: ../../../docs/components.md#vendored-code-that-keeps-its-upstream-api
[comp-extract]: ../../../docs/components.md#8-when-to-extract-a-component
[ds-tokens]: ../../../docs/design-system.md#1-tokens
[ds-android]: ../../../docs/design-system.md#5-android-rules
[ds-states]: ../../../docs/design-system.md#state-components
[ds-motion]: ../../../docs/design-system.md#7-motion
[state-homes]: ../../../docs/client-state.md#1-the-homes-of-state
[state-persist]: ../../../docs/client-state.md#4-persistence
[perf-lists]: ../../../docs/performance.md#2-lists
[perf-method]: ../../../docs/performance.md#8-release-build-measurement-method-checklist-for-a-perf-claim
[decisions]: ../../../README.md#decisions-and-recorded-deviations
[uniwind]: ../../../README.md#uniwind-native-rules
[env]: ../../../README.md#environment
[agents-route]: ../../../AGENTS.md#read-the-doc-before-changing-the-area
[agents-code]: ../../../AGENTS.md#code-rules
[agents-device]: ../../../AGENTS.md#device-verification
[agents-maint]: ../../../AGENTS.md#doc-maintenance
