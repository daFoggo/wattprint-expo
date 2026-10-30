# Design system

Tokens, type, spacing, Android rules, component usage and accessibility for this app. Written 2026-10-25 against
Expo SDK 58.0.19, React Native 0.88.0, React 19.3.0, Uniwind 1.13.0, Tailwind CSS 4.3.3, `@gluestack-ui/core` 5.0.15,
`react-native-reanimated` 4.7.1. Related: [components.md](components.md) (composition and variants),
[architecture.md](architecture.md), [client-state.md](client-state.md) (the theme preference store),
[performance.md](performance.md). Theme changed 2026-10-26: Sense-style tonal surfaces (grey page, white flat cards, no
border or shadow) and the Emerald green primary; the demo is [design-system/wattprint-design-system.html](design-system/wattprint-design-system.html).

Labels: **(verified: ...)** names the file, command or URL checked. **(opinion)** is our choice or advice, not proven.
This project styles with Uniwind classes and semantic tokens only; there is no second styling system and no
design-token TypeScript file (verified: `src/global.css` is the single source; `README.md` "Decisions").

## 1. Tokens

Source: `src/global.css`. Each token is a space separated RGB triple defined twice, in `:where(.light, .light *)` and
`:where(.dark, .dark *)` inside `@layer theme`, and mapped to a Tailwind colour by `@theme inline`
(`--color-primary: rgb(var(--primary))`), so `bg-primary`, `bg-primary-strong`, `text-primary-foreground`, `border-border`, `accent-primary`
and `bg-overlay/50` all exist (verified: `src/global.css`). `Uniwind.setTheme` switches the block
(verified: <https://docs.uniwind.dev/theming/basics.md>). Values below are copied from the file.

| Token                    | Light RGB       | Dark RGB        | Intended use (and where it is used today)                                      |
| ------------------------ | --------------- | --------------- | ------------------------------------------------------------------------------ |
| `background`             | 244 244 244     | 15 20 18        | Page, grey so white cards stand out (`bg-background` on every screen root, states) |
| `foreground`             | 14 32 25        | 242 245 243     | Primary text (`text-foreground`)                                               |
| `card`                   | 255 255 255     | 24 31 28        | Flat raised surface: Card, list rows (`bg-card`, no border, no shadow)         |
| `card-foreground`        | 14 32 25        | 242 245 243     | Text on `card` (defined; no class uses it yet, `text-foreground` is equal)     |
| `popover`                | 255 255 255     | 24 31 28        | Menus and popovers (defined; unused)                                           |
| `popover-foreground`     | 14 32 25        | 242 245 243     | Text on `popover` (defined; unused)                                            |
| `primary`                | 10 155 84       | 22 160 90       | Bright green for shapes only: Switch track, Progress track tint, chart bars, cursor and spinner (`accent-primary`). Not for small text |
| `primary-strong`         | 6 122 70        | 43 212 125      | Default Button and Badge fill, Progress fill, link text; the only green for small text |
| `primary-foreground`     | 255 255 255     | 4 33 15         | Text and icons on `primary-strong`                                             |
| `secondary`              | 236 238 237     | 34 43 39        | Secondary Button fill, Input fill (`bg-secondary`)                             |
| `secondary-foreground`   | 14 32 25        | 242 245 243     | Text on `secondary`                                                            |
| `muted`                  | 236 238 237     | 34 43 39        | Quiet fills: image placeholder, pressed row (`active:bg-muted`)                |
| `muted-foreground`       | 101 108 104     | 142 152 147     | Secondary text, input placeholder and icon (`text-muted-foreground`)           |
| `accent`                 | 232 235 233     | 34 43 39        | Pressed or hover fill of outline and ghost Buttons                             |
| `accent-foreground`      | 14 32 25        | 242 245 243     | Text on a pressed outline Button                                               |
| `destructive`            | 200 40 30       | 255 122 112     | Destructive Button fill, error text (`text-destructive`), invalid input border |
| `destructive-foreground` | 255 255 255     | 250 250 250     | Text on a destructive Button                                                   |
| `border`                 | 224 227 225     | 44 54 49        | Dividers and outline Button border (`border-border`); decorative, not 3:1      |
| `input`                  | 133 141 137     | 100 110 105     | Switch off track (`accent-input`), outline Button dark fill tint (`dark:bg-input/[0.045]`) |
| `ring`                   | 6 122 70        | 43 212 125      | Focused Input border (`data-[focus=true]:border-ring`)                         |
| `overlay`                | 0 0 0           | 0 0 0           | Modal backdrop (`bg-overlay/50`)                                               |
| `switch-thumb`           | 255 255 255     | 255 255 255     | Switch thumb (`accent-switch-thumb`)                                           |

Surface rule (opinion, from the Sense app measured on 2026-10-24): depth comes from the step from `background` to `card`,
never from a border or shadow. Cards are `rounded-3xl`, Buttons and Inputs `rounded-2xl`.

Rules:

- Use only these token class names for colour: `bg-*`, `text-*`, `border-*`, `accent-*` (non-style colour props such as
  `ActivityIndicator`, see `README.md` "Uniwind native rules"). No hex, `rgb()`, `hsl()` or palette classes
  (`bg-red-500`). Enforced by `scripts/design-guard.test.ts` for hex colours in a colour position, colour functions (`rgb()`, `hsl()`, `color-mix()`, ...), literal values of `*Color` style props (`color: 'white'`) and `dark:` colour pairs;
  palette classes are not guarded (opinion: add if they appear).
- No `dark:` colour pairs outside `src/components/ui` (the tokens already switch). The guard allows `dark:` pairs anywhere
  under `src/components/ui/` (vendored upstream code); today `badge` and `button` have them (verified: `grep -rln 'dark:' src --include=*.tsx
  --include=*.ts --exclude-dir=ui` finds no file with a `dark:` class outside `ui`; inside `ui`, `badge` and `button`
  `index.tsx` match, 2026-10-26). One `rgb(` template is
  allow-listed in `src/lib/nav-theme.ts`: the exact literal `rgb(${parts.join(', ')})`, which turns a token triple into the CSS
  colour React Navigation needs.
- Never put `text-destructive-foreground` on a solid `bg-destructive` in dark: that pair is 2.77:1 (section 2). The Button
  avoids it with `dark:bg-destructive/60`.
- A custom control drawn with a border (checkbox, select) uses `border-input` (3:1); `border-border` is for dividers only
  (decorative). The `Input` is the exception: a filled `bg-secondary` field with a transparent resting border, like Sense; see
  the known limit in section 2.
- Green: use `bg-primary-strong` / `text-primary-strong` for a Button fill or any text; `bg-primary` is for shapes (its white
  text pair is 3.60:1 and fails the 4.5:1 text rule).
- To change a colour, edit the triple in both blocks in `src/global.css`, add or update the pair in `PAIRS` in
  `scripts/contrast-report.js`, and re-run `node scripts/contrast-report.js` (section 2); `scripts/contrast.test.ts` must pass.
  Do not add a token for one screen (opinion).
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
| `foreground` on `background`          | text | 15.41 pass  | 16.94 pass  |
| `card-foreground` on `card`           | text | 16.94 pass  | 15.28 pass  |
| `popover-foreground` on `popover`     | text | 16.94 pass  | 15.28 pass  |
| `primary-foreground` on `primary-strong` (Button, Badge) | text | 5.41 pass | 8.80 pass |
| `primary-strong` on `background`      | text | 4.92 pass   | 9.58 pass   |
| `primary-strong` on `card`            | text | 5.41 pass   | 8.64 pass   |
| `secondary-foreground` on `secondary` | text | 14.54 pass  | 13.26 pass  |
| `accent-foreground` on `accent`       | text | 14.11 pass  | 13.26 pass  |
| `destructive-foreground` on solid `destructive` | text | 5.56 pass | not used; n/a in script |
| `muted-foreground` on `background`    | text | 4.90 pass   | 6.26 pass   |
| `muted-foreground` on `muted`         | text | 4.62 pass   | 4.89 pass   |
| `destructive` on `background`         | text | 5.05 pass   | 7.32 pass   |
| `destructive-foreground` on `destructive/60` over `background` (dark Button) | text | n/a | 5.36 pass |
| `destructive-foreground` on `destructive/60` over `card` | text | n/a | 5.06 pass |
| `destructive-foreground` on `destructive/50` over `background` (dark Button pressed) | text | n/a | 6.69 pass |
| `muted-foreground` on `input/30` over `background` (older dark Input pair, still checked) | text | n/a | 4.60 pass |
| `foreground` on `input/30` over `background` | text | n/a | 12.46 pass |
| `foreground` on `input/4.5` and `input/7.5` over `background` (dark outline Button fill, pressed) | text | n/a | 16.35 / 15.93 pass |
| `muted-foreground` on `card`          | text | 5.39 pass   | 5.64 pass   |
| `primary` on `background`             | ui   | 3.28 pass   | 5.50 pass   |
| `primary` on `card` (chart bars, Switch track) | ui | 3.60 pass | 4.96 pass |
| `primary-strong` on `primary/20` over `card` (Progress fill on its track) | ui | 4.27 pass | 6.55 pass |
| `switch-thumb` on `primary` (Switch thumb on the on track) | ui | 3.60 pass | 3.38 pass |
| `switch-thumb` on `card` (thumb next to its card, dark only) | ui | n/a | 16.78 pass |
| `switch-thumb` on `input` (thumb on the off track) | ui | 3.40 pass | 5.28 pass |
| `input` on `background` (Switch off track) | ui | 3.10 pass | 3.52 pass |
| `input` on `card`                     | ui   | 3.40 pass   | 3.18 pass   |
| `ring` on `background`                | ui   | 4.92 pass   | 9.58 pass   |
| `ring` on `card`                      | ui   | 5.41 pass   | 8.64 pass   |
| `ring` on `secondary` (focused Input border against its fill) | ui | 4.64 pass | 7.50 pass |
| `destructive` on `secondary` (invalid Input border against its fill) | ui | 4.77 pass | 5.73 pass |

**Known limit (Input):** like Sense, the Input is a filled `bg-secondary` field without a resting border, so the field
against `card` or `background` is about 1.1:1 and does not meet 3:1 for the control boundary (WCAG 1.4.11). It is
carried by the always-visible label and placeholder, the 48 dp height and the focus border (4.64:1 light, 7.50:1 dark). This is
an accepted design trade-off (opinion); to restore a 3:1 boundary give the Input `border-input` again. Light thumb on `card` is
1.00 (white on white): the track carries the state there (verified: `node scripts/contrast-report.js`, 2026-10-26).

Before the 2026-10-26 theme change (same script): `primary` was near-black grey (23 23 23) with 17.93:1 on `background`, the
Input drew `border-input` and `ring` was 64 / 212. The green `primary` is only 3.60:1 against white, so small text and Button
fills moved to `primary-strong` (5.41:1) and `primary` stayed for shapes. `border` is still a divider token and not a checked pair.

The script (`node scripts/contrast-report.js`) also composites alpha classes over their parent token, which is how
`bg-destructive/60` renders; rows with "over" use that. It models only the pairs listed in `PAIRS`. The table is measured;
the reading below is opinion.

- Dark `destructive-foreground` on **solid** `destructive` is not rendered: the dark destructive Button is
  `bg-destructive/60` (5.36:1 over `background`, 5.06:1 over `card`, 6.69:1 pressed at `/50`). Rule: never put
  `text-destructive-foreground` on a solid `bg-destructive` in dark.
- `muted-foreground` on `muted` now passes (4.62:1 light), so the old "keep it off `muted`" rule is lifted for short text.
- `KNOWN_FAILURES` in the script is empty. The invalid Input border (`border-destructive`) is 4.77:1 / 5.73:1 against the field.
- `scripts/contrast.test.ts` runs the script's pairs in Jest: any pair below its threshold fails, except the labelled
  known failures, and a known failure that starts passing fails too (stale entry).
- `README.md` says the dark input placeholder has low contrast; the Input fill is now `bg-secondary` and `muted-foreground` on
  `secondary` is not a checked pair, so check the placeholder on the device (unverified).

## 3. Type

Uniwind resolves Tailwind's `text-*` sizes; Tailwind v4 defines `text-xs` 12px, `text-sm` 14px, `text-base` 16px,
`text-lg` 18px, `text-xl` 20px, `text-2xl` 24px, `text-3xl` 30px with line heights 16, 20, 24, 28, 28, 32, 36 px
(verified: <https://tailwindcss.com/docs/font-size>; React Native treats these as scalable units, see section 6).
No custom font or `--text-*` token is defined (verified: `src/global.css`). Sizes in use outside `src/components/ui`,
counted on 2026-10-25 with the command below: `text-sm` 12, `text-base` 5, `text-lg` 4, `text-2xl` 2, `text-3xl` 1; weights
`font-semibold` 6, `font-bold` 3, `font-medium` 1. `text-xs` has no use outside `src/components/ui` (it appears in Button `sm`).

```sh
grep -rhoE '(^|[ "'"'"'`])text-(xs|sm|base|lg|xl|[2-9]xl)([ "'"'"'`]|$)' src --include=*.ts --include=*.tsx \
  --exclude-dir=ui --exclude='*.test.ts' --exclude='*.test.tsx' | sort | uniq -c
```

Swap the pattern for `font-(medium|semibold|bold)`, `gap-[0-9]+`, `(p|px|py)-[0-9]+` or `rounded(-[a-z]+)?` for the other counts.

| Role                  | Classes in use                                               | Seen in                                        |
| --------------------- | ------------------------------------------------------------ | ---------------------------------------------- |
| Screen title          | `text-foreground text-3xl font-bold`, `text-2xl font-bold`   | `screens/home` (`Heading size="2xl"`), `screens/settings`, `screens/not-found` |
| Section or card title | `text-foreground text-lg font-semibold`                      | state titles, modal title, detail price        |
| Row title, list body  | `text-foreground text-base font-semibold`, `text-base`       | list rows, detail description                   |
| Secondary text        | `text-muted-foreground text-sm` (`text-center` in states)    | descriptions, banners, row category            |
| Button label          | `text-sm` (`text-xs` for `size="sm"`), colour from variant   | `ButtonText`                                   |
| Error or helper       | `text-destructive text-sm` with `accessibilityLiveRegion`    | `sample-form` email error (`screens/settings`)   |

Headings carry `accessibilityRole="header"` (verified: `empty-state.tsx`, `error-state.tsx`, `screens/settings/index.tsx`, `screens/home/index.tsx`).
Use these roles; add a new one only after a second screen needs it (opinion).

## 4. Spacing, radius, size

No spacing token exists beyond Tailwind's scale (4 px steps). Tiers in use outside `src/components/ui`
(same grep, 2026-10-25): gap `gap-1` 3, `gap-2` 3, `gap-3` 3, `gap-4` 2; padding `px-4` 4, `py-3` 4, `px-6` 2, `p-6` 1,
`p-4` 1, `p-2` 1, `py-12` 1; radius `rounded-md` 1, `rounded-lg` 1 (counts from before the 2026-10-26 theme). Used as:

| Tier | Class        | Use                                                    |
| ---- | ------------ | ------------------------------------------------------ |
| tight | `gap-1`     | title + subtitle inside a row or field                 |
| base | `gap-2`, `gap-3` | siblings in a form or row; state container `gap-3` |
| loose | `gap-4`, `p-6`, `px-6` | stacked controls on a screen, state container padding |
| gutter | `px-4`, `py-3` | list and row horizontal gutter 16 dp, vertical 12 dp |

Radius: `rounded-3xl` Card (24 dp), `rounded-2xl` Button and Input (16 dp) since 2026-10-26; `rounded-md` for image thumbnails; `rounded-lg` once. Do not add arbitrary values
(`w-[320px]`, `p-[13px]`) (opinion; not guarded). Screens use `bg-background flex-1` as root and
`contentContainerClassName` on scroll views (verified: `screens/settings/index.tsx`).

## 5. Android rules

- **Touch targets: 48dp minimum**
  (verified: <https://support.google.com/accessibility/android/answer/7101858>: "a width and height of at least 48dp").
  `Button` enforces it: `default` `min-h-12`, `sm` `min-h-12`, `lg` `min-h-14`, `icon` `min-h-12 min-w-12`; Tailwind `h-12` is
  48 dp (verified: `button/index.tsx`, `button.test.tsx`). The modal close button adds `min-h-12 min-w-12`
  (verified: `screens/settings/index.tsx`). A pressable row sets its own `min-h-12`; do not rely on content height (see Pressable). `Input` is `min-h-12` (48 dp; tested in `input.test.tsx`).
  **Known gap:** `InputSlot` has no minimum size (verified: `input/index.tsx`); no screen uses a slot yet.
- **Dark mode:** the preference is `system | light | dark` in `usePreferencesStore`; the root layout calls
  `Uniwind.setTheme(usePreferencesStore.getState().theme)` at module load, before the first render (comment in
  `src/app/_layout.tsx`), and `GluestackUIProvider` calls `Uniwind.setTheme(mode)` in `useLayoutEffect` (verified: both
  files). Choosing `light` or `dark` also sets React Native's color scheme so native `Alert`/`Modal` match; `system`
  follows the device (verified: <https://docs.uniwind.dev/theming/basics.md>). `app.json` has `userInterfaceStyle: automatic`.
  Whether the first release frame flashes the wrong theme is open (backlog, "T4").
- **Status bar:** `<StatusBar style="auto" />` from `expo-status-bar` in the root layout (verified: `src/app/_layout.tsx`).
- **Safe areas:** screens with the native header (Settings) rely on it for the top inset; `NativeTabs` handles the bottom
  (opinion: not verified for edge-to-edge in this documentation change). Screens that hide the native header start with
  `ScreenHeader`, which adds the top inset with `useSafeAreaInsets` from `react-native-safe-area-context` (a dependency;
  see "Headers and tab bar" in section 6).
- **Predictive back** is off (`predictiveBackGestureEnabled: false`, verified: `app.json`).
- **Keyboard:** lists and scroll views with inputs set `keyboardShouldPersistTaps="handled"`
  (verified: `screens/settings/index.tsx`).

## 6. Component usage

Detailed composition rules: [components.md](components.md). The components are vendored gluestack v5 under
`src/components/ui` (verified: `README.md`).

### Button

| Need                   | Use                                                                            |
| ---------------------- | ------------------------------------------------------------------------------ |
| Main action            | `<Button><ButtonText>...</ButtonText></Button>` (`variant="default"`)          |
| Selected toggle option | `variant={selected ? 'default' : 'outline'}` plus `accessibilityState={{ selected }}` (`screens/settings/index.tsx`) |
| Dangerous action       | `variant="destructive"`                                                        |
| Secondary, quiet       | `secondary`, `outline`, `ghost`, `link`                                        |
| Compact in a toolbar   | `size="sm"` (still 48 dp tall); icon only: `size="icon"` with `accessibilityLabel` |
| Busy                   | add `<ButtonSpinner />` as a child; its colour follows the variant             |
| Layout in a row        | `className="flex-1"` only                                                      |

Disabled looks like `opacity-40` through `data-[disabled=true]`. Label text is always a `ButtonText` child (an i18n key).

### Input

`Input` (frame) + `InputField` (the `TextInput`) + optional `InputIcon`/`InputSlot`. The frame is a filled `bg-secondary`
`rounded-2xl` field with a transparent `border-2`; focus shows `border-ring`. Pass `isInvalid` for the error border
and render the error text below with `selectable` and `accessibilityLiveRegion="polite"` (verified: `screens/settings/sample-form.tsx`).
Always set `accessibilityLabel` or `aria-label` on `InputField` (verified: `screens/settings/sample-form.tsx`).
Placeholder, cursor and selection colours come from `*ClassName` bindings already inside `InputField`; do not pass
`placeholderTextColor`.

### Headers and tab bar

The Home and Devices tabs hide the native header (`<Stack screenOptions={{ headerShown: false }}>`, verified:
`src/app/(app)/(home)/_layout.tsx`, `src/app/(app)/(devices)/_layout.tsx`) and render their scroll content in
`CollapsingScrollView` (`src/components/collapsing-scroll-view.tsx`), the Sense pattern: a large title (`ScreenHeader`,
`src/components/screen-header.tsx`: `text-3xl` bold, optional subtitle and action) at the top of the content that scrolls away,
and a flat compact bar (`bg-background`, no blur, border or shadow) with the centred title that fades in between 16 and 48 dp of
scroll. The bar is hidden from TalkBack so the title is announced once, by the large header. The scroll offset is written to a
Reanimated shared value from the JS `onScroll` event (`scrollY.set(...)`; the React Compiler lint forbids `.value =` in a
handler), which is enough for a fade; use `useAnimatedScrollHandler` if a heavier effect is added. `ScreenHeader` adds the
safe area top inset itself (`useSafeAreaInsets`), because the native header no longer clears the status bar. The native large
title is iOS only (verified: `headerLargeTitleEnabled` is marked `@platform ios` in
`node_modules/expo-router/build/react-navigation/native-stack/types.d.ts`), so Android needs this component. Jest has a
global Reanimated mock in `jest.setup.ts` (the official mock does not load without the native worklets runtime).
`DetailHeader` (`src/components/detail-header.tsx`) is the same idea for a detail screen: a `RoundIconButton`
(`src/components/round-icon-button.tsx`, 48 dp, `bg-card`, no border or shadow) for back, an optional centred title and a
trailing slot. No screen uses `DetailHeader` yet because there is no detail route; add `headerShown: false` to that screen.
The Settings tab still uses the native header (opinion: move it when its screen is restyled).

The tab bar stays a real `NativeTabs` (Material 3 on Android). `useTabBarTheme` (`src/hooks/use-tab-bar-theme.ts`, pure part
`src/lib/tab-bar-theme.ts`) passes token colours as props: `backgroundColor` is `card`, `indicatorColor` and `rippleColor` are
`muted`, and icon and label are `muted-foreground`, or `primary-strong` when selected. The props take colour values, not
classes, so the hook reads the tokens with `useCSSVariable` like `use-nav-theme`. A floating pill bar like Sense would need a
custom `tabBar` and loses the native ripple and accessibility behaviour (opinion), so it was not built. Checked on a Pixel 8a
on 2026-10-26: Home and Devices, light and dark, and the collapse on the Devices tab (dark).

### Modal

`Modal isOpen onClose` > `ModalBackdrop` + `ModalContent` > `ModalHeader` (title `Text` with `accessibilityRole="header"` and
a `ModalCloseButton` with `accessibilityLabel`, 48 dp) + `ModalBody` + `ModalFooter` (verified: `screens/settings/index.tsx`). Sizes
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
| Failed or paused refresh with cached data | banner text, not a state  | a text banner with `accessibilityLiveRegion="polite"` (example feature removed 2026-10-26) |

Full screen by default; pass `className="flex-none p-2"` to embed (verified: `state-style.ts`). Data rules:
[data-fetching.md](data-fetching.md).

### Card, Heading, Text, Divider

`Card` is `bg-card rounded-3xl` (no border, no shadow); `size="default"` is `p-4 gap-3`, `size="sm"` is `p-3 gap-3`
(verified: `src/components/ui/card/styles.tsx`). The dashboard and list screens use `size="sm"`. `Heading` takes `size` and
carries `accessibilityRole="header"` at the call site; `Text` takes `size` (`2xs` to `3xl`) and class colour tokens
(`text-muted-foreground`). `Text` `isTruncated` maps to `line-clamp-1`; it is not used by our code and was not exercised on a
device (verified: `README.md` "gluestack-ui"; opinion: wrap long names instead, as `DeviceRow` does). `Divider` is `h-px bg-border`
and no screen uses it yet (verified: grep of `src` outside `components/ui`).

### Switch and switch rows

The whole row is the control: a `Pressable` with `accessibilityRole="switch"`, `accessibilityState={{ checked, disabled }}`,
`accessibilityLabel` and `min-h-12`, containing a `Switch` wrapped in a `View` with `pointerEvents="none"` and
`importantForAccessibility="no-hide-descendants"`, so TalkBack sees one node and the small native Switch is only an indicator
(verified: `src/features/devices/components/device-row.tsx`, `device-row.test.tsx`). Colour bindings are inside `Switch`:
`trackColorOnClassName="accent-primary"`, `trackColorOffClassName="accent-input"`, `thumbColorClassName="accent-switch-thumb"`
(verified: `src/components/ui/switch/index.tsx`); the contrast pairs are in section 2 (the dark thumb is white since 2026-10-26, so the old off-track limit is gone). An
offline device sets `disabled` on the row `Pressable`, which dims the row once (`opacity-40` through `data-[disabled=true]`) and
blocks the press; the inner `Switch` is not given `disabled`, so it does not dim a second time.

### Badge

`Badge variant="default | secondary | destructive | outline"` with a `BadgeText` child (`text-xs uppercase`)
(verified: `src/components/ui/badge/index.tsx`). `DeviceRow` uses `secondary` for online and `outline` for offline. A badge is
not a touch target.

### Progress

`<Progress value={n}><ProgressFilledTrack /></Progress>`: `h-2` track `bg-primary/20`, fill `bg-primary-strong`. `value` is a 0 to 100
percentage; compute it with a guarded selector so a zero total gives 0, not `NaN` (verified: `shareOf` in
`src/features/energy/energy-selectors.ts`, tested in `energy-selectors.test.ts`).

### Pressable

`Pressable` (the gluestack part) has only a disabled opacity in its base; a pressable row sets its own `min-h-12` (48 dp) at
the call site, as `DeviceRow` does (verified: `device-row.tsx`). Do not rely on content height for the target.

### Energy chart (victory-native)

A Skia canvas is invisible to TalkBack and cannot read Uniwind classes. So the chart is a Card with `accessible` and an
`accessibilityLabel` summary, the bar colour comes from `useCSSVariable('--primary')` converted by `toCssColor` (a hook that
re-runs when the theme changes), and axis labels are React Native `Text` outside the canvas, so they follow the font scale
(verified: `src/features/energy/components/energy-chart.tsx`, `hooks/use-chart-bar-color.ts`, their tests). A range with no
points or only zeros renders `EmptyState` and never mounts `CartesianChart` (verified: `energy-chart.test.tsx`). Skia is
2.14.0 and victory-native 42.0.1 (verified: `README.md` "Pinned versions").

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
  `.reduceMotion(...)`. Test on the phone with "Remove animations" before claiming it (open doubt).
- Guidance (opinion): animate opacity and transform only; keep durations short (the modal uses 200 ms); never carry
  meaning by motion alone; check `expo-animation` skill before adding gestures or sheets.
- A dev-only showcase screen that renders every token, variant and state is **out of scope** here and a good future item
  (backlog).

## 8. Accessibility

- **Roles:** `accessibilityRole="header"` on titles, `button` on pressable rows, `progressbar` on the loading indicator
  (verified: states). `accessibilityRole` values `button`, `header`, `link` (external only; use `button` for
  in-app navigation), `tab`, `switch` are valid; `role` takes precedence if both are set
  (verified: <https://reactnative.dev/docs/accessibility>).
- **Labels:** if a touchable has no `accessibilityLabel`, TalkBack reads its child text; icon-only controls and images that
  are decoration need one or `accessible={false}` (give the row one full label and hide the thumbnail).
- **Live regions:** `accessibilityLiveRegion` `polite` for changing status and errors; `assertive` interrupts and is for
  urgent cases only (verified: <https://reactnative.dev/docs/accessibility>; used in `error-state.tsx`, `screens/settings/sample-form.tsx`).
- **State:** expose selection with `accessibilityState={{ selected }}`, disabled with `accessibilityState`/`isDisabled`.
- **Font scaling:** `allowFontScaling` defaults to `true` and follows the system text size; `maxFontSizeMultiplier` caps it
  (verified: <https://reactnative.dev/docs/text>). Nothing in `src` sets either, so text scales without limit. Do not
  fix text heights (`h-*`) on text containers; use `min-h-*` so large text does not clip (opinion). Test the largest
  system font size on the phone for a new screen (done for the four tabs at 2.0 on 2026-10-26).
- **Selectable text:** error text is `selectable` (project rule in `AGENTS.md`).

## Checklist

- [ ] Only token classes for colour; `scripts/design-guard.test.ts` passes (via `pnpm check`).
- [ ] New or changed token: both theme blocks edited, the pair added to `PAIRS`, `node scripts/contrast-report.js` re-run and
      `scripts/contrast.test.ts` green; table in section 2 updated.
- [ ] A custom bordered control uses `border-input`, never `border-border`; green text and Button fills use `primary-strong`.
- [ ] Every pressable is at least 48 dp tall and wide, including inputs and icon buttons (or the gap is recorded).
- [ ] A tab screen that hides the native header uses `CollapsingScrollView` (or `ScreenHeader` for a non-scrolling screen); tab bar colours come from tokens.
- [ ] Titles have `accessibilityRole="header"`; icon-only controls have a label; status text has a live region.
- [ ] Text uses a type role from section 3; no fixed heights on text containers.
- [ ] Looked at light and dark on the phone (see AGENTS.md "Device verification").
- [ ] Animations use opacity or transform, are short, and reduced motion was considered.
- [ ] A new variant or state updates the usage tables here in the same commit.

## Anti-patterns

- `bg-[#fff]`, `style={{ color: '#333' }}`, `bg-red-500`, `rgb(...)` in a class: use a token.
- `bg-white dark:bg-black`: the tokens already switch themes.
- `placeholder:`, `hover:`, `focus-visible:`, `group-*`: silently ignored on native (see `README.md`).
- `className="h-8 px-2 text-xs"` on a Button instead of `size`/`variant`.
- `bg-primary` under small or white text (3.60:1): use `bg-primary-strong`.
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
