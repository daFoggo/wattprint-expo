# Components and composition

How we build and use components. Written 2026-10-25 against React 19.3.0, React Native 0.88.0, Uniwind 1.13.0,
`@gluestack-ui/core` 5.0.15, `@gluestack-ui/utils` 5.0.6, `tailwind-variants` (the library under `tva`) as
installed in `node_modules`. Related: [architecture.md](architecture.md) (where components live),
[design-system.md](design-system.md) (tokens, sizes, touch targets), [client-state.md](client-state.md) (state that
a compound component may read), [performance.md](performance.md) (list rows).

Labels: **(verified: ...)** names the file, command or URL that was checked. **(opinion)** is our choice, not proven.

## 1. Source of the rules

The rules follow the Vercel `composition-patterns` skill (MIT, version 1.0.0), published at
<https://github.com/vercel-labs/agent-skills/tree/main/skills/composition-patterns> and installed as
`~/.claude/skills/vercel-composition-patterns` (verified: its SKILL.md and rules files read on 2026-10-25). It has
eight rules; the skill's examples use `TextInput`, so it covers React Native, and we adapt each one to gluestack and Uniwind:

| #   | Skill rule                            | Our adaptation                                                            | Section |
| --- | ------------------------------------- | ------------------------------------------------------------------------- | ------- |
| 1   | `architecture-avoid-boolean-props`    | No boolean mode props; use `variant`/`size` through `tva` or composition  | 3       |
| 2   | `architecture-compound-components`    | Parts share context; gluestack `withStyleContext`/`useStyleContext` is it | 2       |
| 3   | `state-decouple-implementation`       | Only the provider knows where state lives (store, query or `useState`)    | 6       |
| 4   | `state-context-interface`             | Context value is `{ state, actions, meta }`                               | 6       |
| 5   | `state-lift-state`                    | Lift state into a provider so siblings outside the UI frame can read it   | 6       |
| 6   | `patterns-explicit-variants`          | One named component per mode, built on shared parts                       | 3       |
| 7   | `patterns-children-over-render-props` | `children` for structure, render props only when data flows back          | 4, 5    |
| 8   | `react19-no-forwardref`               | `ref` is a prop and `use()` replaces `useContext()` in our own code       | 7       |

Our state-rule examples are not in the code base yet: `grep -rn createContext src` finds no match; the vendored parts share
state through gluestack's `withStyleContext`/`useStyleContext`. Sections 6 and 7 are therefore the rule for the first compound
component we write, not a description of existing code.

## 2. Compound parts

A component with several visual parts is a set of exported parts that share one context, not one component with a
prop per part. Existing examples, all vendored gluestack (verified: `src/components/ui/button/index.tsx`,
`modal/index.tsx`, `input/index.tsx`):

- `Button` + `ButtonText` + `ButtonSpinner` + `ButtonIcon` + `ButtonGroup`. `Button` calls
  `withStyleContext(Pressable, 'BUTTON')` and passes `context={{ variant, size }}`; each part reads it with
  `useStyleContext('BUTTON')` and styles itself through a `tva` `parentVariants` block.
- `Modal` + `ModalBackdrop` + `ModalContent` + `ModalHeader` + `ModalBody` + `ModalFooter` + `ModalCloseButton`
  (used in `src/screens/home/index.tsx`).
- `Input` + `InputField` + `InputIcon` + `InputSlot`.

```tsx
// src/screens/home/sample-form.tsx (verified): the caller composes the parts, no label/handler props.
<Button onPress={() => form.handleSubmit()}>
  <ButtonText>{t('form.submit')}</ButtonText>
</Button>
```

Rule: when you need a spinner, an icon or a second line inside a Button, add it as a child
(`<ButtonSpinner />`, `<ButtonIcon as={...} />`), never as `loading`, `icon` or `subtitle` props
(opinion, from skill rule 2).

## 3. No boolean-prop proliferation, explicit variants

A boolean prop that changes layout or look (`isCompact`, `withBorder`, `isDestructive`) multiplies states and tends to
grow. Use one of:

1. **A named variant or size** declared in `tva`. `Button` has `variant` (`default`, `destructive`, `outline`,
   `secondary`, `ghost`, `link`) and `size` (`default`, `sm`, `lg`, `icon`) (verified: `buttonStyle` in
   `src/components/ui/button/index.tsx`). A destructive button is `variant="destructive"`, not `isDanger`.
2. **A separate component** for a distinct mode, built on shared parts. `OfflineState` is an explicit variant of
   `EmptyState` for a query paused by connectivity: it fixes `title` and defaults `description`, and takes the rest of
   `EmptyState`'s props (verified: `src/components/states/offline-state.tsx`, `states.test.tsx`). A caller never writes
   `<EmptyState isOffline />`.
3. **Composition**: pass different children.

State props that mirror platform or gluestack state are not a violation: `isInvalid`, `isDisabled`, `isOpen` are
interaction state, and `data-[invalid=true]:` styling reads them (verified: `Input` in
`src/components/ui/input/index.tsx`; `<Input isInvalid=...>` in `sample-form.tsx`).

### Add a variant

1. Add the key to the `variants` object of the component's `tva` (and to `parentVariants` blocks of every part that
   reads it: text, icon, spinner), using semantic tokens only.
2. Keep the Android touch target: every `Button` size has `min-h-12` or larger (`button.test.tsx` asserts it). See [design-system.md](design-system.md).
3. Add a test that the host element receives the class or binding (Uniwind does not resolve classes to numbers
   under Jest; assert whole class tokens, as `button.test.tsx` does).
4. Record the vendored deviation in `README.md` "Decisions" if you edit a file under `src/components/ui/` (the
   48dp sizes and the modal `ZoomIn` edit are recorded there).
5. Update [design-system.md](design-system.md) usage tables in the same commit (see AGENTS.md maintenance rule).

### Size and variants through `tva`, never `className` overrides at call sites

Choose a `variant` or `size`; do not fight a component with `className="h-8 px-2 text-xs"`. `tva` wraps
`tailwind-variants` (verified: `node_modules/@gluestack-ui/utils/lib/esm/nativewind-utils/tva/index.js` imports `tv`),
and a passed `class` replaces conflicting utilities instead of stacking
(verified: `tv({ base: 'bg-background flex-1 p-6' })({ class: 'flex-none p-2' })` returned
`bg-background flex-none p-2` when run in this repo). That is the escape hatch for **layout** the caller owns (`flex-1`,
`w-full`, margins, `self-*`); the repo uses it that way, for example `className="flex-1"` on a `Button` inside a row in
`products-screen.tsx` and `className` on the state components, whose base is full screen
(`src/components/states/state-style.ts`). Not allowed at a call site: changing height, padding, text size or colour
of a component that has `variant`/`size` for it (opinion; the touch-target rule makes it enforceable in review).

## 4. Children and slots over `label` + `handler` props

When a component shows a variable piece of UI, take it as `children` (or `ReactNode` slots) instead of a prop pair
such as `actionLabel` + `onAction`.

```tsx
// src/components/states/empty-state.tsx (verified): the state does not know what the action is.
type EmptyStateProps = Omit<ViewProps, 'children' | 'className'> & {
  title?: string;
  description?: string;
  className?: string;
  children?: ReactNode; // action slot
};
```

```tsx
// src/components/states/states.test.tsx (verified): the caller decides the action.
<EmptyState title="No data">
  <Button onPress={onPress}>
    <ButtonText>Add</ButtonText>
  </Button>
</EmptyState>
```

Strings that are data (`title`, `description`, `label`) stay props: they are values, not UI, and i18n keys are
resolved by the caller (`t(...)`).

**Known exception, and why.** `ErrorState` takes `onRetry?: () => void` and renders its own retry `Button`
(verified: `src/components/states/error-state.tsx`). It has exactly one action, with fixed copy (`errors.retry`) and
fixed style, used by every data screen and by the root `ErrorBoundary` (`src/screens/route-error`). A slot would make
each caller re-declare the same button. If a second action appears (report, go home), change it to a children slot
like `EmptyState` (opinion).

## 5. Render props only where data flows back

A render prop is right when the parent produces a value the child needs per call (skill rule 7).
In this repo (verified in the files named):

| Place                                                                     | Why a render prop is correct                       |
| ------------------------------------------------------------------------- | -------------------------------------------------- |
| FlashList / FlatList `renderItem` (`products-screen.tsx`, `list-bench-*`) | the list supplies `item` and `index` per row       |
| `<form.Field name="email">{(field) => ...}</form.Field>` (`sample-form`)  | TanStack Form supplies `field` state and handlers  |

Do not add `renderHeader`, `renderFooter`, `renderIcon` to our own components; accept children. `SearchField`
(`src/features/lab/components/search-field.tsx`) is a value-in, value-out wrapper (`value`, `onChangeText`, `label`,
`placeholder`); it has no slots because it has one job.

## 6. Context interface and state placement

If a compound component needs shared state (a composer, a multi-step form, a filter bar), follow skill rules 3 to 5:

```tsx
// Shape of the context value (skill rule `state-context-interface`).
type FilterContext = {
  state: { query: string };
  actions: { setQuery: (query: string) => void };
  meta: { inputRef: React.RefObject<TextInput | null> };
};
const FilterContext = createContext<FilterContext | null>(null);

function useFilter() {
  const value = use(FilterContext); // `use` reads context and may be called conditionally
  if (value === null) throw new Error('Filter parts must be rendered inside <Filter.Provider>');
  return value;
}
```

- Parts read `useFilter()` and never import a store or a query hook. The **provider** is the only place that decides
  whether the state is `useState`, a Zustand store ([client-state.md](client-state.md)) or a TanStack Query result.
- Lift the provider above the parts that need it, not into a global store, unless the state must outlive the screen.
- A compound component that belongs to one feature lives in that feature (`src/features/<name>/components`);
  it moves to `src/components` only by the rule in section 8.

## 7. React 19 specifics

- `ref` is a regular prop in React 19 and `forwardRef` "will be deprecated in a future release"
  (verified: <https://react.dev/reference/react/forwardRef>, fetched 2026-10-25). Our own code does not use
  `forwardRef`: `function Field({ ref, ...props }: Props & { ref?: React.Ref<TextInput> })`. This is a convention;
  no lint rule enforces it today (verified: `eslint.config.js` has no such rule, and `no-deprecated` does not flag
  `forwardRef` while it is not marked deprecated).
- `use(Context)` replaces `useContext(Context)` and can be called conditionally; it still must run in a component or
  hook (verified: <https://react.dev/reference/react/use>).
- React Compiler is on (`experiments.reactCompiler: true` in `app.json`), so do not add `useMemo`/`useCallback`
  by habit; see [performance.md](performance.md) for the list-prop stability question.

### Vendored code that keeps its upstream API

`src/components/ui/**` is hand-copied from the gluestack-ui Uniwind template and is exempt from the no-`forwardRef`
rule and from the `no-deprecated` lint rule (verified: `ignores: ['src/components/ui/**']` in `eslint.config.js`).
Exactly these files use `React.forwardRef` today (verified: `grep -rl forwardRef src`):

| File                                | Components using `forwardRef`                                                             |
| ----------------------------------- | ----------------------------------------------------------------------------------------- |
| `src/components/ui/button/index.tsx` | `Button`, `ButtonText`, `ButtonSpinner`, `ButtonIcon`, `ButtonGroup`                      |
| `src/components/ui/input/index.tsx`  | `Input`, `InputIcon`, `InputSlot`, `InputField`                                           |
| `src/components/ui/modal/index.tsx`  | `Modal`, `ModalBackdrop`, `ModalContent`, `ModalHeader`, `ModalBody`, `ModalFooter`, `ModalCloseButton` |
| `src/components/ui/icon/index.tsx`   | `Icon`, the icon created by `createIconUI`                                               |

`gluestack-ui-provider/index.tsx` does not use it. Keep these as upstream so a later re-copy diffs cleanly; do not
convert them piecemeal. Add new components next to them only when they are gluestack parts; everything else is ours.

## 8. When to extract a component

Consistent with [architecture.md](architecture.md): extract to shared (`src/components`, `src/lib`) only when
**a second feature needs it, it has a nameable role, and its API is smaller than its implementation**; until then
duplicate. `components` never imports `features`, `screens` or `app` (enforced by `eslint.boundaries.js`).

| Situation                                                                          | Do                                                      |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Used once, inside one screen                                                       | Keep inline or a local function in the screen file      |
| Used by several screens of **one** feature                                         | `src/features/<name>/components/<name>-thing.tsx`       |
| Needed by a second feature and has a role name (`EmptyState`)                      | `src/components/<group>/`                               |
| Only style repeated (a container class string)                                     | A `tva` next to the components (`state-style.ts`)       |
| Wrapper around a third-party component that needs Uniwind                          | `withUniwind` once in one file, reuse (`StyledImage` in `features/lab/components/styled-image.tsx`, `StyledUIIcon`) |
| Needs a visual change that `variant`/`size` cannot express                         | Add a variant (section 3), not a call-site override     |

Naming: kebab-case files, feature-prefixed component files (`product-row.tsx`), tests colocated. `StyledImage = withUniwind(Image)` was defined twice in the lab feature
(`product-row.tsx` and `product-detail-screen.tsx`) and now lives once in `src/features/lab/components/styled-image.tsx`. A second
feature using `expo-image` is the signal to move it to `src/components` (opinion; not yet needed).

## Checklist

- [ ] Parts are children of a parent; no `icon`, `loading`, `subtitle` props where a child works.
- [ ] No boolean prop changes look or layout; a `variant`/`size` in `tva`, or a separate named component.
- [ ] Variable UI arrives as `children`; render props only for list rows, form fields and similar data flow.
- [ ] No `forwardRef` or `useContext` in new code outside `src/components/ui/**`; `ref` is a prop; `use()` reads context.
- [ ] Call sites pass layout classes only, never size, padding, text size or colour overrides.
- [ ] Colours are semantic tokens ([design-system.md](design-system.md)); touch targets are at least 48dp.
- [ ] Shared extraction obeys the second-feature rule; imports obey `eslint.boundaries.js`.
- [ ] A test asserts the new variant or slot; usage tables in `design-system.md` are updated in the same commit.

## Anti-patterns

- `<Button isLoading label="Save" icon={...} />`: boolean and label props instead of `<ButtonSpinner />` and `<ButtonText>`.
- `<EmptyState actionLabel="Add" onAction={add} />`: the state would have to know every action.
- `<Button className="h-8 px-2 text-xs">`: use `size="sm"`; the 48dp floor then still holds.
- A new `renderFooter` prop on one of our components.
- Editing a vendored file for a feature need without recording the deviation in `README.md`.
- `forwardRef` or `useContext` in new non-vendored code.
- Adding `useMemo`/`useCallback` around everything because the compiler's behaviour was not checked.

## Sources

- Vercel composition patterns: <https://github.com/vercel-labs/agent-skills/tree/main/skills/composition-patterns>
  (local copy `~/.claude/skills/vercel-composition-patterns`).
- React `forwardRef`: <https://react.dev/reference/react/forwardRef>; React `use`: <https://react.dev/reference/react/use>.
- gluestack-ui v5 / Uniwind (project decisions): `README.md` "Decisions and recorded deviations".
- Our code: `src/components/ui/**`, `src/components/states/**`, `src/screens/home/**`, `src/features/lab/**`.
