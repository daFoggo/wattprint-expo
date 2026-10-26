# Components digest

Use when writing or changing a component, a variant, a ref, or anything under `src/components`. Full rules:
[docs/components.md](../../../../docs/components.md); usage tables: [docs/design-system.md](../../../../docs/design-system.md#6-component-usage).

## Decision matrix

| Need                                     | Pattern                                                                                                                                               |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spinner, icon or second line in a Button | Child parts (`ButtonSpinner`, `ButtonIcon`, `ButtonText`), never `loading`, `icon`, `subtitle` props                                                  |
| A different look                         | A `variant` or `size` in `tva` (and in every part that reads it), or a separate named component                                                       |
| Layout the caller owns                   | `className` with layout only (`flex-1`, `w-full`, margins), never height, padding, text size or colour                                                |
| Variable UI inside a component           | `children` or slots; render props only where data flows back (list rows, form fields)                                                                 |
| A ref to a TextInput or Pressable        | `ref` is a regular prop: `function Field({ ref, ...props }: Props & { ref?: React.Ref<TextInput> })`                                                  |
| Reading context                          | `use(Context)`, not `useContext`                                                                                                                      |
| Several parts share state                | A provider owns it (`useState`, a store or a query); parts read `{ state, actions, meta }` (`device-states.tsx`, `energy-chart.tsx`)                  |
| A canvas chart (Skia, victory-native)    | Card root with a summary `accessibilityLabel`; colour read outside the canvas; labels as RN `Text`; the `CartesianChart` render prop is the library's |
| A wrapper over a third-party component   | `withUniwind` once in one file                                                                                                                        |
| Memoisation                              | None by habit: React Compiler is on                                                                                                                   |

## Vendored exception

`src/components/ui/**` is hand-copied gluestack code. It keeps `React.forwardRef` (12 files, all under `ui`), `dark:` pairs (`badge`, `button`, `input`) and the upstream API so a re-copy
diffs cleanly; do not convert it piecemeal and record any edit in `README.md` "Decisions and recorded deviations". New files next to
it only for gluestack parts. Everything else is ours: no `forwardRef`, no `useContext`.

## Never do

- `<Button isLoading label="Save" icon={...} />` or `<EmptyState isOffline />`.
- `<Button className="h-8 px-2 text-xs">` (use `size="sm"`, which is still 48 dp).
- `forwardRef` or `useContext` in non-vendored code (no lint rule catches it today; review does).
- Extract to shared before a second feature needs it.

A new variant also needs a test that asserts the class token (`button.test.tsx` is the model) and an updated usage table in the same commit.
