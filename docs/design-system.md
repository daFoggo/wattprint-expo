# Design system

Tokens, type, spacing, Android rules, component usage and accessibility for this app. Written 2026-10-25 against
Expo SDK 58.0.19, React Native 0.88.0, React 19.3.0, Uniwind 1.13.0, Tailwind CSS 4.3.3, `@gluestack-ui/core` 5.0.15,
`react-native-reanimated` 4.7.1. Related: [components.md](components.md) (composition and variants),
[architecture.md](architecture.md), [client-state.md](client-state.md) (the theme preference store),
[performance.md](performance.md).

Labels: **(verified: ...)** names the file, command or URL checked. **(opinion)** is our choice or advice, not proven.
This project styles with Uniwind classes and semantic tokens only; there is no second styling system and no
design-token TypeScript file (verified: `src/global.css` is the single source; `README.md` "Decisions").

## 1. Tokens

Source: `src/global.css`. Each token is a space separated RGB triple defined twice, in `:where(.light, .light *)` and
`:where(.dark, .dark *)` inside `@layer theme`, and mapped to a Tailwind colour by `@theme inline`
(`--color-primary: rgb(var(--primary))`), so `bg-primary`, `text-primary-foreground`, `border-border`, `accent-primary`
and `bg-overlay/50` all exist (verified: `src/global.css`). `Uniwind.setTheme` switches the block
(verified: <https://docs.uniwind.dev/theming/basics.md>). Values below are copied from the file.

| Token                    | Light RGB       | Dark RGB        | Intended use (and where it is used today)                                      |
| ------------------------ | --------------- | --------------- | ------------------------------------------------------------------------------ |
| `background`             | 255 255 255     | 10 10 10        | Screen and page background (`bg-background` on every screen root, states)      |
| `foreground`             | 10 10 10        | 250 250 250     | Primary text (`text-foreground`)                                               |
| `card`                   | 255 255 255     | 23 23 23        | List rows and raised surfaces (`bg-card` in `ProductRow`)                      |
| `card-foreground`        | 10 10 10        | 250 250 250     | Text on `card` (defined; no class uses it yet, `text-foreground` is equal)     |
| `popover`                | 255 255 255     | 23 23 23        | Menus and popovers (defined; unused)                                           |
| `popover-foreground`     | 10 10 10        | 250 250 250     | Text on `popover` (defined; unused)                                            |
| `primary`                | 23 23 23        | 255 245 245     | Default Button fill, cursor and selection tint, spinner (`accent-primary`)     |
| `primary-foreground`     | 250 250 250     | 23 23 23        | Text and icons on `primary`                                                    |
| `secondary`              | 245 245 245     | 38 38 38        | Secondary Button fill                                                          |
| `secondary-foreground`   | 23 23 23        | 250 250 250     | Text on `secondary`                                                            |
| `muted`                  | 245 245 245     | 38 38 38        | Quiet fills: image placeholder, pressed row (`active:bg-muted`)                |
| `muted-foreground`       | 115 115 115     | 161 161 161     | Secondary text, input placeholder and icon (`text-muted-foreground`)           |
| `accent`                 | 247 247 247     | 38 38 38        | Pressed or hover fill of outline and ghost Buttons                             |
| `accent-foreground`      | 52 52 52        | 250 250 250     | Text on a pressed outline Button                                               |
| `destructive`            | 231 0 11        | 255 100 103     | Destructive Button fill, error text (`text-destructive`), invalid input border |
| `destructive-foreground` | 250 250 250     | 250 250 250     | Text on a destructive Button                                                   |
| `border`                 | 229 229 229     | 46 46 46        | Dividers, outline Button and input border (`border-border`)                    |
| `input`                  | 229 229 229     | 46 46 46        | Input fill tint in dark (`dark:bg-input/30`) and outline Button dark fill      |
| `ring`                   | 163 163 163     | 115 115 115     | Focused input border (`data-[focus=true]:border-ring`)                         |
| `overlay`                | 0 0 0           | 0 0 0           | Modal backdrop (`bg-overlay/50`)                                               |

Rules:

- Use only these token class names for colour: `bg-*`, `text-*`, `border-*`, `accent-*` (non-style colour props such as
  `ActivityIndicator`, see `README.md` "Uniwind native rules"). No hex, `rgb()`, `hsl()` or palette classes
  (`bg-red-500`). Enforced for hex, colour functions and `dark:` colour pairs by `scripts/design-guard.test.ts`;
  palette classes are not guarded (opinion: add if they appear).
- No `dark:` colour pairs outside `src/components/ui` (the tokens already switch). The guard allows the upstream pairs
  in `button` and `input` only; one `rgb(` template is allow-listed in `src/lib/nav-theme.ts`
  (it turns a token triple into the CSS colour React Navigation needs).
- To change a colour, edit the triple in both blocks in `src/global.css` and re-run
  `node scripts/contrast-report.js` (section 2); do not add a token for one screen (opinion).
- The navigation theme reads `--background`, `--foreground`, `--primary`, `--card`, `--border` through `useCSSVariable`
  (verified: `src/hooks/use-nav-theme.ts`), so header and tab chrome follow the tokens.
- The app icon and splash use Expo template colours (`#E6F4FE`, `#208AEF` in `app.json`); they are placeholders, not tokens
  (verified: `app.json`, `README.md` "Open items").

## 2. Contrast

Computed on 2026-10-25 with `node scripts/contrast-report.js` (committed; reads the triples from `src/global.css`,
WCAG 2.x relative luminance, ratio `(L1 + 0.05) / (L2 + 0.05)`). Thresholds: 4.5:1 for normal text, 3:1 for large text
(18 pt, or 14 pt bold) and for non-text UI parts
(verified: <https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html> for text,
<https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html> for UI components).

| Pair (foreground on background)       | Kind | Light       | Dark        |
| ------------------------------------- | ---- | ----------- | ----------- |
| `foreground` on `background`          | text | 19.80 pass  | 18.97 pass  |
| `card-foreground` on `card`           | text | 19.80 pass  | 17.18 pass  |
| `popover-foreground` on `popover`     | text | 19.80 pass  | 17.18 pass  |
| `primary-foreground` on `primary`     | text | 17.18 pass  | 16.76 pass  |
| `secondary-foreground` on `secondary` | text | 16.44 pass  | 14.50 pass  |
| `accent-foreground` on `accent`       | text | 11.62 pass  | 14.50 pass  |
| `destructive-foreground` on `destructive` | text | 4.57 pass | **2.77 fail** |
| `muted-foreground` on `background`    | text | 4.74 pass   | 7.66 pass   |
| `muted-foreground` on `muted`         | text | **4.35 fail** | 5.86 pass |
| `destructive` on `background`         | text | 4.77 pass   | 6.85 pass   |
| `primary` on `background`             | ui   | 17.93 pass  | 18.51 pass  |
| `border` on `background`              | ui   | **1.26 fail** | **1.46 fail** |
| `input` on `background`               | ui   | **1.26 fail** | **1.46 fail** |
| `ring` on `background`                | ui   | **2.52 fail** | 4.18 pass   |

What this means (the table is measured; the reading is opinion):

- Dark `destructive-foreground` on `destructive` fails, but the destructive Button in dark uses
  `dark:bg-destructive/60` (alpha over the background), so the real pair differs and was **not computed**.
- `muted-foreground` text must sit on `background` or `card`, not on `muted` (light fails by 0.15).
- `border` is for dividers. An input whose only boundary is `border-border` (1.26:1 light) is below 3:1 for a control
  boundary; the focused `ring` is 2.52:1 in light. These are template colours, recorded in
  `docs/superpowers/backlog/2026-10-25-design-system-findings.md`; they are not fixed in this documentation change.
- `README.md` records a low-contrast dark input placeholder (known limitation); the script does not model the translucent
  input fill (`dark:bg-input/30`), so that case is not in this table.

## 3. Type

Uniwind resolves Tailwind's `text-*` sizes; Tailwind v4 defines `text-xs` 12px, `text-sm` 14px, `text-base` 16px,
`text-lg` 18px, `text-xl` 20px, `text-2xl` 24px, `text-3xl` 30px with line heights 16, 20, 24, 28, 28, 32, 36 px
(verified: <https://tailwindcss.com/docs/font-size>; React Native treats these as scalable units, see section 6).
No custom font or `--text-*` token is defined (verified: `src/global.css`). Sizes in use outside `src/components/ui`,
counted from `className` strings by script on 2026-10-25: `text-sm` 13, `text-base` 5, `text-lg` 4, `text-2xl` 2, `text-3xl` 1;
weights `font-semibold` 6, `font-bold` 3, `font-medium` 1. `text-xs` appears only inside Button `sm`/text variants.

| Role                  | Classes in use                                               | Seen in                                        |
| --------------------- | ------------------------------------------------------------ | ---------------------------------------------- |
| Screen title          | `text-foreground text-3xl font-bold`, `text-2xl font-bold`   | `screens/home`, `screens/not-found`, detail    |
| Section or card title | `text-foreground text-lg font-semibold`                      | state titles, modal title, detail price        |
| Row title, list body  | `text-foreground text-base font-semibold`, `text-base`       | `ProductRow`, `QuoteRow`, detail description   |
| Secondary text        | `text-muted-foreground text-sm` (`text-center` in states)    | descriptions, banners, row category            |
| Button label          | `text-sm` (`text-xs` for `size="sm"`), colour from variant   | `ButtonText`                                   |
| Error or helper       | `text-destructive text-sm` with `accessibilityLiveRegion`    | `sample-form` email error                      |

Headings carry `accessibilityRole="header"` (verified: `empty-state.tsx`, `error-state.tsx`, `home/index.tsx`).
Use these roles; add a new one only after a second screen needs it (opinion).

## 4. Spacing, radius, size

No spacing token exists beyond Tailwind's scale (4 px steps). Tiers in use outside `src/components/ui`
(script count, 2026-10-25): gap `gap-1` 3, `gap-2` 6, `gap-3` 2, `gap-4` 2; padding `px-4` 4, `py-3` 4, `px-6` 2, `p-6` 1,
`p-4` 1, `py-12` 1; radius `rounded-md` 4, `rounded-lg` 1. Used as:

| Tier | Class        | Use                                                    |
| ---- | ------------ | ------------------------------------------------------ |
| tight | `gap-1`     | title + subtitle inside a row or field                 |
| base | `gap-2`, `gap-3` | siblings in a form or row; state container `gap-3` |
| loose | `gap-4`, `p-6`, `px-6` | stacked controls on a screen, state container padding |
| gutter | `px-4`, `py-3` | list and row horizontal gutter 16 dp, vertical 12 dp |

Radius: `rounded-md` for controls and image thumbnails; `rounded-lg` once. Do not add arbitrary values
(`w-[320px]`, `p-[13px]`) (opinion; not guarded). Screens use `bg-background flex-1` as root and
`contentContainerClassName` on scroll views (verified: `screens/home/index.tsx`).

## 5. Android rules

- **Touch targets: 48dp minimum**
  (verified: <https://support.google.com/accessibility/android/answer/7101858>: "a width and height of at least 48dp").
  `Button` enforces it: `default` `min-h-12`, `sm` `min-h-12`, `lg` `min-h-14`, `icon` `min-h-12 min-w-12`; Tailwind `h-12` is
  48 dp (verified: `button/index.tsx`, `button.test.tsx`). The modal close button adds `min-h-12 min-w-12`
  (verified: `screens/home/index.tsx`). A pressable row is tall enough through `py-3` plus content (`ProductRow` has a
  64 dp image, `size-16`). **Known gap:** `Input` is `min-h-9` (36 dp) and `InputSlot` has no minimum
  (verified: `input/index.tsx`); not changed here, see the backlog finding.
- **Dark mode:** the preference is `system | light | dark` in `usePreferencesStore`; the root layout calls
  `Uniwind.setTheme(usePreferencesStore.getState().theme)` at module load, before the first render (comment in
  `src/app/_layout.tsx`), and `GluestackUIProvider` calls `Uniwind.setTheme(mode)` in `useLayoutEffect` (verified: both
  files). Choosing `light` or `dark` also sets React Native's color scheme so native `Alert`/`Modal` match; `system`
  follows the device (verified: <https://docs.uniwind.dev/theming/basics.md>). `app.json` has `userInterfaceStyle: automatic`.
  Whether the first release frame flashes the wrong theme is open (backlog, "T4").
- **Status bar:** `<StatusBar style="auto" />` from `expo-status-bar` in the root layout (verified: `src/app/_layout.tsx`).
- **Safe areas:** screens do not use `SafeAreaView` or `useSafeAreaInsets` (verified: grep of `src` finds neither);
  headers and tab bar come from the native stack and `NativeTabs` (opinion: they handle insets; not verified on a device
  for edge-to-edge in this documentation change). When a screen draws under the system bars, add insets with
  `react-native-safe-area-context` (a dependency).
- **Predictive back** is off (`predictiveBackGestureEnabled: false`, verified: `app.json`).
- **Keyboard:** lists and scroll views with inputs set `keyboardShouldPersistTaps="handled"`
  (verified: `home/index.tsx`, `products-screen.tsx`).

## 6. Component usage

Detailed composition rules: [components.md](components.md). The components are vendored gluestack v5 under
`src/components/ui` (verified: `README.md`).

### Button

| Need                   | Use                                                                            |
| ---------------------- | ------------------------------------------------------------------------------ |
| Main action            | `<Button><ButtonText>...</ButtonText></Button>` (`variant="default"`)          |
| Selected toggle option | `variant={selected ? 'default' : 'outline'}` plus `accessibilityState={{ selected }}` (`home/index.tsx`) |
| Dangerous action       | `variant="destructive"`                                                        |
| Secondary, quiet       | `secondary`, `outline`, `ghost`, `link`                                        |
| Compact in a toolbar   | `size="sm"` (still 48 dp tall); icon only: `size="icon"` with `accessibilityLabel` |
| Busy                   | add `<ButtonSpinner />` as a child; its colour follows the variant             |
| Layout in a row        | `className="flex-1"` only                                                      |

Disabled looks like `opacity-40` through `data-[disabled=true]`. Label text is always a `ButtonText` child (an i18n key).

### Input

`Input` (frame) + `InputField` (the `TextInput`) + optional `InputIcon`/`InputSlot`. Pass `isInvalid` for the error border
and render the error text below with `selectable` and `accessibilityLiveRegion="polite"` (verified: `sample-form.tsx`).
Always set `accessibilityLabel` or `aria-label` on `InputField` (verified: `sample-form.tsx`, `search-field.tsx`).
Placeholder, cursor and selection colours come from `*ClassName` bindings already inside `InputField`; do not pass
`placeholderTextColor`.

### Modal

`Modal isOpen onClose` > `ModalBackdrop` + `ModalContent` > `ModalHeader` (title `Text` with `accessibilityRole="header"` and
a `ModalCloseButton` with `accessibilityLabel`, 48 dp) + `ModalBody` + `ModalFooter` (verified: `home/index.tsx`). Sizes
`xs` to `full`, default `md`. Use for short confirmations; a full-screen task is a route, not a modal (opinion).

### Icon

`<Icon as={CloseIcon} size="md" />`; sizes `2xs`, `xs`, `sm`, `md` (18 px), `lg`, `xl`; colour from `text-*` on the icon
(`text-foreground` default) (verified: `icon/index.tsx` and the README note that gluestack `Icon` takes colour from
`text-*`). Inside a Button use `ButtonIcon`. An icon-only control needs an `accessibilityLabel` on its pressable.
`Svg`/Lucide icons used directly need `withUniwind` and are not guarded.

### State components

| Situation                              | Component                    | Notes                                                           |
| -------------------------------------- | ---------------------------- | --------------------------------------------------------------- |
| First load, nothing cached             | `LoadingState`               | `progressbar` role, label from i18n                             |
| Loaded, zero rows                      | `EmptyState` (+ children)    | title, optional description, action as children                 |
| Failed, nothing cached                 | `ErrorState`                 | message from `errorMessage`, `selectable`, polite live region, retry |
| Query paused offline, nothing cached   | `OfflineState`               | variant of `EmptyState`                                         |
| Failed or paused refresh with cached data | banner text, not a state  | `staleBanner` in the lab feature, `accessibilityLiveRegion="polite"` |

Full screen by default; pass `className="flex-none p-2"` to embed (verified: `state-style.ts`). Data rules:
[data-fetching.md](data-fetching.md).

## 7. Motion

- Reanimated 4.7.1 is installed and used only in the gluestack Modal (`FadeIn`/`FadeOut` backdrop, `ZoomIn`/`FadeOut`
  content, 200 ms) (verified: `modal/index.tsx`). There is no other animation code.
- Reanimated animations default to `ReduceMotion.System`; with reduced motion on, `withTiming`/`withSpring` jump to the
  end value, and entering/keyframe/layout animations jump to their end state while exiting ones are skipped. For
  layout animations the page says to set it per animation (for example `BounceIn.reduceMotion(ReduceMotion.System)`).
  `useReducedMotion` returns the setting read at app launch and does not update during the session
  (verified: <https://docs.swmansion.com/react-native-reanimated/docs/guides/accessibility/>,
  <https://docs.swmansion.com/react-native-reanimated/docs/device/useReducedMotion/>).
- **Not verified:** whether the modal's `FadeIn.duration(200)` honours the system setting without an explicit
  `.reduceMotion(...)`. Test on the emulator with "Remove animations" before claiming it (open doubt).
- Guidance (opinion): animate opacity and transform only; keep durations short (the modal uses 200 ms); never carry
  meaning by motion alone; check `expo-animation` skill before adding gestures or sheets.
- A dev-only showcase screen that renders every token, variant and state is **out of scope** here and a good future item
  (backlog).

## 8. Accessibility

- **Roles:** `accessibilityRole="header"` on titles, `button` on pressable rows, `progressbar` on the loading indicator
  (verified: states, `ProductRow`). `accessibilityRole` values `button`, `header`, `link` (external only; use `button` for
  in-app navigation), `tab`, `switch` are valid; `role` takes precedence if both are set
  (verified: <https://reactnative.dev/docs/accessibility>).
- **Labels:** if a touchable has no `accessibilityLabel`, TalkBack reads its child text; icon-only controls and images that
  are decoration need one or `accessible={false}` (`ProductRow` sets a full row label and hides the thumbnail).
- **Live regions:** `accessibilityLiveRegion` `polite` for changing status and errors; `assertive` interrupts and is for
  urgent cases only (verified: <https://reactnative.dev/docs/accessibility>; used in `error-state.tsx`, `sample-form.tsx`).
- **State:** expose selection with `accessibilityState={{ selected }}`, disabled with `accessibilityState`/`isDisabled`.
- **Font scaling:** `allowFontScaling` defaults to `true` and follows the system text size; `maxFontSizeMultiplier` caps it
  (verified: <https://reactnative.dev/docs/text>). Nothing in `src` sets either, so text scales without limit. Do not
  fix text heights (`h-*`) on text containers; use `min-h-*` so large text does not clip (opinion). Test the largest
  system font size on the emulator for a new screen.
- **Selectable text:** error text is `selectable` (project rule in `AGENTS.md`).

## Checklist

- [ ] Only token classes for colour; `scripts/design-guard.test.ts` passes (via `pnpm check`).
- [ ] New or changed token: both theme blocks edited and `node scripts/contrast-report.js` re-run; table in section 2 updated.
- [ ] Every pressable is at least 48 dp tall and wide, including inputs and icon buttons (or the gap is recorded).
- [ ] Titles have `accessibilityRole="header"`; icon-only controls have a label; status text has a live region.
- [ ] Text uses a type role from section 3; no fixed heights on text containers.
- [ ] Looked at light and dark on the emulator (see AGENTS.md "Device verification").
- [ ] Animations use opacity or transform, are short, and reduced motion was considered.
- [ ] A new variant or state updates the usage tables here in the same commit.

## Anti-patterns

- `bg-[#fff]`, `style={{ color: '#333' }}`, `bg-red-500`, `rgb(...)` in a class: use a token.
- `bg-white dark:bg-black`: the tokens already switch themes.
- `placeholder:`, `hover:`, `focus-visible:`, `group-*`: silently ignored on native (see `README.md`).
- `className="h-8 px-2 text-xs"` on a Button instead of `size`/`variant`.
- Text on `bg-muted` using `text-muted-foreground` in light (4.35:1).
- Passing `placeholderTextColor` or `color` props instead of `*ClassName="accent-..."` bindings.
- Meaning carried only by colour (a red border without error text).
- `h-10` on a container of text (clips with a large system font).

## Sources

- Our code: `src/global.css`, `src/components/ui/**`, `src/components/states/**`, `src/hooks/use-nav-theme.ts`,
  `src/app/_layout.tsx`, `scripts/contrast-report.js`, `scripts/design-guard.test.ts`, `scripts/uniwind-guard.test.ts`.
- Uniwind theming: <https://docs.uniwind.dev/theming/basics.md>.
- Tailwind font size: <https://tailwindcss.com/docs/font-size>.
- Android touch target: <https://support.google.com/accessibility/android/answer/7101858>.
- WCAG contrast: <https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html>,
  <https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html>.
- React Native accessibility and Text: <https://reactnative.dev/docs/accessibility>, <https://reactnative.dev/docs/text>.
- Reanimated accessibility: <https://docs.swmansion.com/react-native-reanimated/docs/guides/accessibility/>,
  <https://docs.swmansion.com/react-native-reanimated/docs/device/useReducedMotion/>.
