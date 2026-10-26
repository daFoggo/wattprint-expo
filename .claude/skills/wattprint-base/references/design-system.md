# Design system and Uniwind digest

Use for any className, colour, theme, spacing, type, touch target, accessibility or animation change. Full rules and the token
table: [docs/design-system.md](../../../../docs/design-system.md); native pitfalls: [README.md](../../../../README.md#uniwind-native-rules).

## Decision matrix

| Need                                                          | Pattern                                                                                                                                                                   |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Any colour                                                    | Token class (`bg-background`, `text-foreground`, `border-input`, `text-destructive`); source is `src/global.css`                                                          |
| Colour for a non-style prop                                   | `*ClassName="accent-..."` binding (`placeholderTextColorClassName="accent-muted-foreground"`, `ActivityIndicator`, Switch track/thumb, Svg icons)                         |
| Input placeholder style                                       | Never `placeholder:`; `InputField` already binds it, do not pass `placeholderTextColor`                                                                                   |
| Hover, focus-visible, `web:`, `group-*`                       | Not available on native; use `data-[focus\|active\|disabled\|invalid=true]:` states                                                                                       |
| Dark mode                                                     | Nothing: tokens switch with the theme; no `dark:` colour pairs outside `src/components/ui`                                                                                |
| Border of a control (input, checkbox, select, custom control) | `border-input` (3:1); `border-border` is for dividers only                                                                                                                |
| New or changed token                                          | Edit both theme blocks in `src/global.css`, add the pair to `PAIRS`, run `node scripts/contrast-report.js`; `scripts/contrast.test.ts` must pass; update the table        |
| Third-party component with `className`                        | `withUniwind` once in one file (`StyledUIIcon`, `StyledImage`)                                                                                                            |
| Pressable size                                                | At least 48 dp wide and tall; `Button` sizes enforce `min-h-12`; text containers use `min-h-*`, never `h-*`                                                               |
| Switch row                                                    | The `Pressable` row is the target (`min-h-12`, `accessibilityRole="switch"`); the native `Switch` inside is `pointerEvents="none"` and hidden from TalkBack (`DeviceRow`) |
| Chart colour (Skia)                                           | `useCSSVariable('--primary')` plus `toCssColor`, read outside the canvas, so it follows the theme (`useChartBarColor`)                                                    |
| Input field                                                   | `Input` is `min-h-12` (48 dp) with a 3:1 `border-input`; `InputSlot` has no minimum size                                                                                  |
| Titles, icon-only controls, errors                            | `accessibilityRole="header"`; `accessibilityLabel`; `selectable` text with a polite live region                                                                           |
| Spacing                                                       | Tailwind scale tiers (`gap-1..4`, `px-4`, `py-3`); no arbitrary values (`w-[320px]`)                                                                                      |
| Animation                                                     | Opacity and transform, short, never meaning by motion alone; check reduced motion                                                                                         |

## Guards

`scripts/design-guard.test.ts` fails on hex, `rgb()`/`hsl()`, literal `*Color` values and `dark:` colour pairs outside
`src/components/ui`. `scripts/uniwind-guard.test.ts` fails on unsupported classes in string literals and missing colour bindings on
`ActivityIndicator` and `TextInput`. Palette classes (`bg-red-500`), Svg/Lucide icons and arbitrary sizes are not guarded.

## Never do

- `bg-[#fff]`, `style={{ color: '#333' }}`, `bg-red-500`, `bg-white dark:bg-black`.
- `placeholder:text-muted-foreground`, `hover:bg-accent`: Uniwind ignores them silently, there is no warning.
- `text-destructive-foreground` on a solid `bg-destructive` in dark (2.77:1); see the contrast section.
- NativeWind or a second styling system.
