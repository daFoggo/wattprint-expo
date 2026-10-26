# Smarthome UI Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A UI-only smart-home demo with Home, Devices, Energy and Settings tabs. It uses static mock data validated by Zod and an energy chart drawn with victory-native (Skia), and it runs on the Android dev build.

**Architecture:** Two feature slices, `src/features/devices` and `src/features/energy`. Each has `schemas.ts`, `mock-data.ts`, selectors, hooks, components and its own screen. `src/screens/home` composes summaries from both features, and features never import each other. Device on/off state is a `useState` provider, `DeviceStatesProvider`, lifted above `NativeTabs` in the root layout so Home and Devices agree. The extra gluestack parts are hand-copied from the cached Uniwind template.

**Tech Stack:** Expo SDK 58.0.19, RN 0.88.0, React 19.3.0, expo-router 58.0.26 NativeTabs, Uniwind 1.13.0, gluestack-ui v5 (`@gluestack-ui/core` 5.0.15, `@gluestack-ui/utils` 5.0.6), Zod 4.6.7, i18next. New packages:

- `@shopify/react-native-skia`: Expo pins 2.14.0 (verified: `node_modules/expo/bundledNativeModules.json`).
- `victory-native`: npm latest is 43.0.1.
- `@expo/html-elements`: needed by the Heading part.

**Spec:** `docs/superpowers/specs/2026-10-26-smarthome-ui-demo-design.md`

## Global Constraints

- Tabs: **Home**, **Devices**, **Energy** and the existing **Settings**. NativeTabs triggers use `md` and `sf` icon names.
- No network, no backend, no persistence of device state, no real device control. Mock data is in `src/features/{devices,energy}/mock-data.ts` and is parsed by `schemas.ts`.
- No alpha gluestack components: Tabs, Table, BottomSheet, Calendar, DateTimePicker, Skeleton, Grid, Liquid Glass, Image Viewer. Never run `gluestack-ui add` or `init`.
- Copy parts by hand from `C:\Users\Foggo\.gluestack\cache\gluestack-ui\apps\starter-kit-expo-uniwind\components\ui\<part>\`. This is the path the CLI's `uniwindComponentsPath` points to (verified: `config.js` of the cached `gluestack-ui` CLI under `%LOCALAPPDATA%\npm-cache\_npx\4d3bda48cf361d69`). Never copy `index.web.tsx` files. Keep pins `@gluestack-ui/core@5.0.15` and `@gluestack-ui/utils@5.0.6`.
- Packages: install with `npx expo install <pkg>` only. Never type versions from memory. Add no peer overrides or `minimumReleaseAgeExclude` entries without the user.
- Feature slices: a feature never imports `@/app`, `@/screens`, another feature or `../`. Inside a feature, use `./` or `@/features/<self>/...`. No barrel files. Kebab-case file names.
- Cross-feature composition happens only in `src/screens` or `src/app`.
- Screen placement: single-feature screens go in `src/features/<name>/screens/*-screen.tsx` (`docs/architecture.md` wins over the original brief). `src/screens` holds only Home (2 features) and Settings.
- Styling: semantic tokens only. No hex, `rgb()` or `hsl()` literals, no palette classes, no `dark:` pairs outside `src/components/ui`. Banned variants: `web:`, `hover:`, `focus-visible:`, `data-[hover=true]`, `group-*`. Control boundaries use `border-input`.
- Composition: no boolean look props; use `variant` or `size`. Children over label+handler props. `ref` is a prop; no `forwardRef` or `useContext` in non-vendored code; `use()` reads context. Context values are `{ state, actions, meta }`; omit `meta` when empty.
- Every pressable is at least 48 dp (`min-h-12`, plus `min-w-12` for icon-only controls). No fixed `h-*` on text containers. Titles have `accessibilityRole="header"`.
- Every user-visible string comes from an i18n key, with identical keys in `en.json` and `vi.json` (`src/i18n/locales.test.ts`). Error text is `selectable`.
- Data strings stay data: device names, room names and top-device names are API-shaped data, not i18n keys.
- React Compiler is on: do not add `useMemo`/`useCallback` by habit.
- **Gates**, run from the repo root, report real output:
  - **G1:** `pnpm check` exits 0 (eslint 0 warnings, tsc, jest).
  - **G2:** `pnpm format:check` prints "All matched files use Prettier code style".
  - **G3:** `npx expo-doctor` reports all checks passed.
  - **G4 (emulator `Medium_Phone_API_37.0`, always `adb -s emulator-5554`, never another device):**
    1. Start the app with `pnpm android` after a native change, or `npx expo start --dev-client` for JS-only changes.
    2. `adb -s emulator-5554 logcat -c`.
    3. Relaunch with the AGENTS.md deep link (with `-p com.dafoggo.wattprint.dev`).
    4. Screenshot: `adb -s emulator-5554 exec-out screencap -p > <scratchpad>\<task>-<view>.png`.
    5. `adb -s emulator-5554 logcat -d ReactNativeJS:V *:S` must have no `E` lines. If only the two known "linking configured in multiple places / multiple navigation containers" lines appear after a deep-link relaunch, relaunch with `adb -s emulator-5554 shell monkey -p com.dafoggo.wattprint.dev 1`, re-read, and report both reads.
    6. Stop Metro (kill the listener on :8081).
- Models: `implementer` (model `sonnet`) writes code; `scout` (model `haiku`) does read-only lookups marked **[scout]**; `reviewer` (model `opus`) runs the phase reviews.
- Commits are conventional (commitlint). Hooks run; never bypass them.

## Review Focus

1. **Dark mode chart and part colours:** bars, switch track and progress fill stay visible on `card` in both themes, and the chart re-colours on theme change. Task 2 (`PAIRS`, `contrast.test.ts`), Task 5 (`useChartBarColor` light/dark/undefined tests), Task 7 (dark screenshots).
2. **Empty or zero usage:** a range with no points or only zeros shows an empty state, never a blank canvas, a crash or a `NaN` percentage. Task 4 (selector tests for `[]`, all-zero, `total = 0`), Task 5 (chart renders `EmptyState`, never mounts `CartesianChart`).
3. **Long device names and Vietnamese text:** names wrap; wattage and switch stay visible. Task 3 (DeviceRow test with an 80-character name), Task 7 (vi screenshots).
4. **48 dp targets on switch rows:** the whole row toggles; the small native Switch is not the only target; an offline device cannot be toggled. Task 3 (`min-h-12`, press-to-toggle, disabled tests).
5. **Large font scale (2.0):** no clipped text on any tab; scene and range buttons still fit. Task 6 (grep for `h-<n>` on text containers), Task 7 (emulator at `font_scale 2.0`).

---

## Phase A: gate and parts

### Task 1: GATE: Skia + victory-native on the dev build

**Model:** implementer (sonnet). **[scout]** steps 4 and 5 can go to scout (haiku).

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml` (generated by the install)
- Temporary, reverted in step 9: `src/screens/settings/index.tsx`

**Interfaces:**
- Produces: installed `@shopify/react-native-skia` (expected 2.14.0) and `victory-native` (expected 43.0.1); a written record in the task report of the exact exported names and props verified in `node_modules/victory-native` typings (`CartesianChart`: `data`, `xKey`, `yKeys`, `domainPadding`, render-prop args `points` and `chartBounds`; `Bar`: `points`, `chartBounds`, `color`, `roundedCorners`) and whether Skia accepted a `rgb(r, g, b)` colour string.

**Steps:**

- [ ] **Step 1: Precondition.** `git status --short`. Expected: empty. If not clean, STOP and report to the user; do not commit their changes yourself.
- [ ] **Step 2: Install Skia.** `npx expo install @shopify/react-native-skia`. Expected: `package.json` has `2.14.0`.
- [ ] **Step 3: Install victory-native.** `npx expo install victory-native`. Copy the full install output, including peer warnings, into the report.
  - npm shows victory-native 43.0.1 with peer Skia `>=2.15.1 <3.0.0` and gesture-handler `>=2.0.0 <4.0.0`. 43.0.0 needs gesture-handler `<3`, so it does not fit RNGH 3.3.0.
  - If pnpm refuses to install (strict peers or minimum release age), STOP and report.
- [ ] **Step 4: Confirm peer ranges.** `node -p "require('victory-native/package.json').peerDependencies"`. Record the Skia key name and range.
- [ ] **Step 5: Config plugins and API.** Check `node_modules/@shopify/react-native-skia/app.plugin.js` and the same for `victory-native`; add a plugin to `app.json` only if one exists and its README requires it, else record "no plugin". Read `node_modules/victory-native/dist/**/*.d.ts` and record the names under Interfaces.
- [ ] **Step 6: Temporary chart.** In `src/screens/settings/index.tsx`, render a temporary `CartesianChart`: 7 points `{ x: i, kwh }` with one zero value, `xKey="x"`, `yKeys={['kwh']}`, inside `className="h-48 w-full"`. The render prop draws `<Bar points={points.kwh} chartBounds={chartBounds} color={barColor} />`. `barColor` is `toCssColor(String(useCSSVariable('--primary')))` (`toCssColor` from `@/lib/nav-theme`, `useCSSVariable` from `uniwind`), proving Skia accepts the token-derived string without a hex literal.
- [ ] **Step 7: Native rebuild.** `pnpm android`. Expected: build succeeds, dev client opens on `emulator-5554`.
- [ ] **Step 8: G4 on the Settings tab.** Light and dark screenshots (switch theme with the base-check buttons on Home). Expected: bars visible in the primary token colour in both themes, zero bar empty, no `E` lines. If the build fails, the app crashes, or bars do not render: STOP. Report build or log output, screenshots and peer warnings. Do not switch chart library; that is the user's decision (spec fallback: gifted-charts).
- [ ] **Step 9: Revert the temporary chart.** `git checkout -- src/screens/settings/index.tsx`. Run G1, G2, G3. Record any G3 peer-mismatch warning verbatim.
- [ ] **Step 10: Commit.**

```bash
git add package.json pnpm-lock.yaml
git commit -m "build(deps): add react-native-skia and victory-native for the energy chart"
```

### Task 2: Hand-copied gluestack parts

**Model:** implementer (sonnet).

**Files:**
- Create from the cache path (`index.tsx` plus `styles.tsx` where it exists, no `index.web.tsx`): `src/components/ui/card/{index,styles}.tsx`, `switch/index.tsx`, `badge/index.tsx`, `progress/index.tsx`, `heading/{index,styles}.tsx`, `text/{index,styles}.tsx`, `pressable/index.tsx`, `divider/index.tsx`
- Test: `src/components/ui/switch/switch.test.tsx`, `badge/badge.test.tsx`, `progress/progress.test.tsx`, `heading/heading.test.tsx`
- Modify: `scripts/uniwind-guard.test.ts` (`REQUIRED_BINDINGS` plus self-test), `scripts/contrast-report.js` (`PAIRS`), `package.json` and lockfile (`@expo/html-elements`), `README.md` (gluestack-ui decision paragraph, Structure line for `src/components/ui/`, Pinned versions)

Part status (read on 2026-10-26 in the cache):

| Part | Stable and copyable | Deviations to apply and record in README |
| --- | --- | --- |
| card | yes (plain View + `tva`) | none |
| switch | yes (`@gluestack-ui/core/switch/creator`) | Remove `web:cursor-pointer`, `disabled:cursor-not-allowed` and `data-[focus=true]:ring-indicator-primary` (no such token). Add bindings on `UISwitch`: `trackColorOnClassName="accent-primary"`, `trackColorOffClassName="accent-input"`, `thumbColorClassName="accent-primary-foreground"`. Uniwind types RN `Switch` as `className?: never` with these three bindings (verified: `node_modules/uniwind/types.d.ts:50-56`). If tsc rejects the template's `className`, drop the `tva` className and record it. |
| badge | yes | `destructive` text/icon `text-white` becomes `text-destructive-foreground`. Reuse `StyledUIIcon` from `@/components/ui/icon` instead of a second `withUniwind(UIIcon)`. |
| progress | yes (`progress/creator`) | none |
| heading | yes, needs `@expo/html-elements` | Remove the `highlight` variant (`bg-yellow-500` palette class). |
| text | yes | Remove `highlight`; `isTruncated` `web:truncate` becomes `truncate`. |
| pressable | yes (`pressable/creator`) | Base becomes `data-[disabled=true]:opacity-40` only (`data-[focus-visible=true]` classes are banned by the guard). |
| divider | yes | none |

Not copied (YAGNI or alpha): box, hstack, vstack, avatar, and every alpha part. The creators exist in core 5.0.15 (verified: `node_modules/@gluestack-ui/core/package.json` exports `switch/creator`, `progress/creator`, `pressable/creator`).

**Interfaces:**
- Produces, as upstream export names: `Card`; `Switch`; `Badge`, `BadgeText`, `BadgeIcon`; `Progress`, `ProgressFilledTrack`; `Heading`; `Text`; `Pressable`; `Divider`.
- Variants: `Badge` `variant` = `'default' | 'secondary' | 'destructive' | 'outline'`; `Card` `size` = `'default' | 'sm'`; `Heading` `size` = `'xs' … '5xl'`; `Text` `size` = `'2xs' … '6xl'`; `Progress` `value: number` (0 to 100).
- Our code never passes the vendored boolean props (`bold`, `italic`, `underline`, `isTruncated`, ...).

**Steps:**

- [ ] **Step 1: Install html-elements.** `npx expo install @expo/html-elements`. Confirm JS-only (no `android/` folder in the package) and `npx expo-doctor` stays green. Fallback: if it warns about peers or breaks jest, skip Heading, use `Text` with `size` and `accessibilityRole="header"`, and record it.
- [ ] **Step 2: Write the failing tests** in the existing style (`button.test.tsx`).

```tsx
// switch.test.tsx
test('Switch binds track and thumb colours to tokens', ...)
// trackColorOnClassName === 'accent-primary'; trackColorOffClassName === 'accent-input';
// thumbColorClassName === 'accent-primary-foreground'. If RN drops unknown props before the host,
// use the composite query available in the RNTL typings and record which one.

// badge.test.tsx
test('destructive BadgeText uses the destructive foreground token', ...)
// className tokens contain 'text-destructive-foreground', not 'text-white'

// progress.test.tsx
test('ProgressFilledTrack fills to the value', ...)
// <Progress value={40}> fills to 40%; read node_modules/@gluestack-ui/core progress creator
// to see where the width lands, and assert it

// heading.test.tsx
test('Heading is announced as a header', ...)
// getByRole('header', { name: 'Title' })
```

- [ ] **Step 3: Run** `pnpm test -- src/components/ui`. Expected: FAIL (modules missing).
- [ ] **Step 4: Copy the parts** and apply the table deviations. Keep `React.forwardRef` as upstream; vendored code is exempt.
- [ ] **Step 5: Guard and contrast updates.**
  - `scripts/uniwind-guard.test.ts`: add `{ tag: 'UISwitch', binding: 'trackColorOnClassName' }` to `REQUIRED_BINDINGS`; self-test: `<UISwitch value />` is flagged, `<UISwitch trackColorOnClassName="accent-primary" />` is not.
  - `scripts/contrast-report.js` `PAIRS`: add `['primary', 'card', 'ui']`, `['primary', 'primary/20@card', 'ui']`, `['muted-foreground', 'card', 'text']`. Run `node scripts/contrast-report.js`. If a new pair fails, STOP and report; do not add it to `KNOWN_FAILURES` without the user.
- [ ] **Step 6: Run** `pnpm test -- src/components/ui scripts`. Expected: PASS.
- [ ] **Step 7: README.** Record each copied part and deviation; update Structure and Pinned versions.
- [ ] **Step 8: Gates.** G1, G2, G3. G4 as a JS-only smoke test (app launches, logcat clean). Visual checks of the parts are in Task 7.
- [ ] **Step 9: Commit.**

```bash
git commit -m "feat(ui): hand-copy card, switch, badge, progress, heading, text, pressable, divider"
```

**Phase A review (reviewer, opus):** scope the diff of Tasks 1 and 2. Check gate evidence, deviations against the cache source (a `diff` per part), guard self-tests, README record. An implementer fix wave follows, then the next phase.

---

## Phase B: features and chart

### Task 3: `devices` feature: schemas, mock data, state provider, rows

**Model:** implementer (sonnet).

**Files:**
- Create: `src/lib/format.ts` and `format.test.ts` (shared from the start because devices and energy both need it; record that in the report); `src/features/devices/schemas.ts`; `mock-data.ts`; `device-selectors.ts` and `device-selectors.test.ts`; `device-states.tsx` and `device-states.test.tsx`; `components/device-row.tsx` and `device-row.test.tsx`; `components/room-section.tsx`; `components/room-summary-card.tsx`
- Modify: `src/i18n/locales/en.json`, `vi.json` (`devices.*`)

**Interfaces:**

```ts
// src/lib/format.ts
export function formatNumber(value: number, locale: string, options?: Intl.NumberFormatOptions): string;

// schemas.ts
export const deviceTypeSchema = z.enum(['light', 'ac', 'fridge', 'tv', 'washer', 'water_heater', 'plug']);
export const deviceSchema = z.object({
  id: z.string(), roomId: z.string(), name: z.string().min(1), type: deviceTypeSchema,
  on: z.boolean(), watts: z.number().nonnegative(), status: z.enum(['online', 'offline']),
});
export const roomSchema = z.object({ id: z.string(), name: z.string().min(1) });
export const devicesResponseSchema = z.object({ rooms: z.array(roomSchema), devices: z.array(deviceSchema) });
export type Device; export type Room; export type DevicesResponse;

// mock-data.ts (parsed at module load, so a bad mock throws into the root ErrorBoundary)
export const devicesMock: DevicesResponse;

// device-selectors.ts
export type RoomGroup = { room: Room; devices: Device[] };
export function groupByRoom(rooms: Room[], devices: Device[]): RoomGroup[]; // room order kept; empty rooms kept
export function currentWatts(devices: Device[]): number;                   // sum watts where on && status === 'online'
export function countOn(devices: Device[]): number;

// device-states.tsx
type DeviceStates = { state: { rooms: Room[]; devices: Device[] }; actions: { toggle: (id: string) => void } };
export function DeviceStatesProvider(props: { children: ReactNode; initial?: DevicesResponse }): ReactNode; // default devicesMock
export function useDeviceStates(): DeviceStates; // use(); throws outside the provider

// components
export function DeviceRow(props: { device: Device; onToggle: (id: string) => void }): ReactNode;
export function RoomSection(props: { room: Room; children: ReactNode }): ReactNode;
export function RoomSummaryCard(props: { room: Room; devices: Device[] }): ReactNode;
```

Behaviour: `toggle` is a no-op for offline devices. `DeviceRow` is one gluestack `Pressable` with `accessibilityRole="switch"`, `accessibilityState={{ checked, disabled }}`, `accessibilityLabel={device.name}` and `min-h-12`. Inside: name `Text` (`flex-1`, no `numberOfLines`), type label (`devices.types.<type>`), status `Badge` (`secondary` online, `outline` offline), watts via `formatNumber`, and a `Switch` wrapped in a View with `pointerEvents="none"` and `importantForAccessibility="no-hide-descendants"`. The row is the single target and single TalkBack node.

**Steps:**

- [ ] **Step 1: Write the failing tests.**

```ts
// format.test.ts
expect(formatNumber(1234.5, 'en', { maximumFractionDigits: 1 })).toBe('1,234.5');
expect(formatNumber(1234.5, 'vi', { maximumFractionDigits: 1 })).toBe('1.234,5');

// device-selectors.test.ts
test('mock data parses and every device points at an existing room', ...)
// safeParse success; ids unique; mock has >=1 offline device and >=1 device name of >=40 chars
test('currentWatts counts only devices that are on and online', ...) // hand-built 3-device fixture
expect(currentWatts([])).toBe(0);
test('groupByRoom keeps room order and empty rooms', ...)

// device-states.test.tsx
test('toggle flips an online device', ...)
test('toggle ignores an offline device', ...)
test('useDeviceStates throws outside the provider', ...)

// device-row.test.tsx (Review Focus 3 and 4)
test('the whole row is a 48dp switch target', ...)   // className tokens of getByRole('switch', { name }) contain 'min-h-12'
test('pressing the row toggles the device', ...)     // accessibilityState.checked flips after fireEvent.press, under DeviceStatesProvider
test('an offline device is disabled and does not toggle', ...)
test('a long name wraps instead of pushing out the watts', ...) // 80-char name: no numberOfLines, 'flex-1', watts text still rendered
```

- [ ] **Step 2: Run** `pnpm test -- src/lib/format src/features/devices`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces. Mock: 3 to 4 rooms and about 10 devices (values are the builder's choice within what tests pin). i18n keys en and vi: `devices.types.*`, `devices.status.online|offline`, `devices.watts` ("{{value}} W"), `devices.onCount`.
- [ ] **Step 4: Run** `pnpm test -- src/lib/format src/features/devices src/i18n`. Expected: PASS.
- [ ] **Step 5: Gates** G1, G2, G3. Commit:

```bash
git commit -m "feat(devices): mock-backed device slice with toggle provider and rows"
```

### Task 4: `energy` feature: schemas, mock data, selectors, summaries

**Model:** implementer (sonnet).

**Files:**
- Create: `src/features/energy/schemas.ts`; `mock-data.ts`; `energy-selectors.ts` and `energy-selectors.test.ts`; `hooks/use-energy-summary.ts`; `components/usage-summary-card.tsx`; `components/top-devices-list.tsx` and `top-devices-list.test.tsx`; `components/energy-range-switch.tsx` and `energy-range-switch.test.tsx`
- Modify: `en.json`, `vi.json` (`energy.*`)

**Interfaces:**
- Consumes: `formatNumber` (Task 3), `Card`, `Progress`, `ProgressFilledTrack`, `Text`, `Heading`, `Button` (Task 2).
- Produces:

```ts
export const energyRangeSchema = z.enum(['day', 'week', 'month']);
export const usagePointSchema = z.object({ at: z.iso.datetime(), kwh: z.number().nonnegative() }); // z.iso.datetime verified in node_modules/zod/v4/classic/iso.d.ts
export const deviceUsageSchema = z.object({ deviceId: z.string(), name: z.string().min(1), kwh: z.number().nonnegative() });
export const energySummarySchema = z.object({
  range: energyRangeSchema, points: z.array(usagePointSchema), topDevices: z.array(deviceUsageSchema),
  pricePerKwh: z.number().positive(), currency: z.string().length(3),
});
export type EnergyRange; export type UsagePoint; export type DeviceUsage; export type EnergySummary;

export const energyMock: Record<EnergyRange, EnergySummary>; // parsed at load; day = 24 hourly points incl. zero night hours
export function useEnergySummary(range: EnergyRange): EnergySummary; // sync, from mock; later swapped for a query

export function totalKwh(points: UsagePoint[]): number;
export function hasUsage(points: UsagePoint[]): boolean;          // some kwh > 0
export function costOf(kwh: number, pricePerKwh: number): number;
export function shareOf(kwh: number, total: number): number;      // 0..100; 0 when total <= 0
export function topN(devices: DeviceUsage[], n: number): DeviceUsage[]; // sorted desc, non-mutating

export function UsageSummaryCard(props: { summary: EnergySummary }): ReactNode;
export function TopDevicesList(props: { devices: DeviceUsage[]; total: number }): ReactNode; // name, kWh, Progress value=shareOf
export function EnergyRangeSwitch(props: { value: EnergyRange; onChange: (r: EnergyRange) => void }): ReactNode;
// one Button per range: variant default when selected, outline otherwise; accessibilityState={{ selected }}
```

**Steps:**

- [ ] **Step 1: Write the failing tests.**

```ts
// energy-selectors.test.ts (Review Focus 2)
test('every range of the mock parses', ...)
expect(totalKwh([])).toBe(0);
expect(hasUsage([])).toBe(false);
expect(hasUsage([{ at, kwh: 0 }, { at, kwh: 0 }])).toBe(false);
expect(shareOf(5, 0)).toBe(0);   // never NaN
expect(shareOf(1, 4)).toBe(25);
expect(costOf(2, 2500)).toBe(5000);
test('topN sorts by kWh and does not mutate', ...)

// top-devices-list.test.tsx
test('renders 0% bars when total is 0', ...)  // no 'NaN' text anywhere

// energy-range-switch.test.tsx
test('marks the selected range and reports a new one', ...)
// accessibilityState.selected true on 'day'; pressing 'week' calls onChange('week')
```

- [ ] **Step 2: Run** `pnpm test -- src/features/energy`. Expected: FAIL.
- [ ] **Step 3: Implement**; add `energy.*` keys: `energy.ranges.*`, `energy.total`, `energy.cost`, `energy.topDevices`, `energy.kwh` ("{{value}} kWh").
- [ ] **Step 4: Run** `pnpm test -- src/features/energy src/i18n`. Expected: PASS.
- [ ] **Step 5: Gates** G1, G2, G3. Commit:

```bash
git commit -m "feat(energy): mock-backed energy slice with summaries and range switch"
```

### Task 5: Energy chart compound part with token colours

**Model:** implementer (sonnet).

**Files:**
- Create: `src/features/energy/hooks/use-chart-bar-color.ts` and `use-chart-bar-color.test.ts`; `components/energy-chart.tsx` and `energy-chart.test.tsx`
- Modify: `jest.setup.ts` (one mock of `victory-native`), `en.json`, `vi.json` (`energy.chartLabel`, `energy.noUsageTitle`)

**Interfaces:**
- Consumes: victory-native names recorded in Task 1; `hasUsage`, `totalKwh`, `UsagePoint` (Task 4); `toCssColor` from `@/lib/nav-theme` (the only allow-listed `rgb(` literal; do not write a new one); `useCSSVariable` from `uniwind` (proven by `src/hooks/use-nav-theme.ts`); `EmptyState` from `@/components/states/empty-state`.
- Produces:

```ts
export function useChartBarColor(): string | null; // toCssColor(--primary) or null when the variable is not a string
export function toChartData(points: UsagePoint[]): { x: number; kwh: number }[]; // x = index
type EnergyChartContext = { state: { points: UsagePoint[]; barColor: string | null } };
export function EnergyChart(props: { points: UsagePoint[]; accessibilityLabel: string; children: ReactNode }): ReactNode;
// Card root and provider. Read the colour OUTSIDE the Skia Canvas and pass it down as a value.
export function EnergyChartBars(): ReactNode;
// no usage: EmptyState (title energy.noUsageTitle, className "flex-none p-2"); barColor null: null;
// otherwise: CartesianChart with Bar in a View "h-48 w-full"
export function EnergyChartAxis(props: { labels: string[] }): ReactNode;
// RN Text row, "text-muted-foreground text-xs", first/middle/last label; scales with system font
```

Rationale: no Skia text, so no font loading and labels honour font scale. The `CartesianChart` children render prop is allowed because the library supplies `points` (`docs/components.md` section 5). The chart root has `accessible` and `accessibilityLabel`, because a canvas is invisible to TalkBack. Jest mock in `jest.setup.ts` (with a comment): `CartesianChart` renders a host `View` with `testID="cartesian-chart"` and passes its `data` prop through; `Bar` returns `null`.

**Steps:**

- [ ] **Step 1: Write the failing tests.**

```ts
// use-chart-bar-color.test.ts (Review Focus 1); jest.mock('uniwind', partial) for useCSSVariable
test('light primary triple becomes a CSS colour', ...)  // '23 23 23' -> 'rgb(23, 23, 23)'
test('dark primary triple becomes a CSS colour', ...)   // '255 245 245' -> 'rgb(255, 245, 245)'
test('returns null when the variable is missing', ...)  // undefined -> null

// energy-chart.test.tsx (Review Focus 2)
test('mounts the chart with one datum per point when there is usage', ...) // props.data length === points.length
test('shows the empty state and no chart when all points are zero', ...)   // queryByTestId('cartesian-chart') null; getByText(en.energy.noUsageTitle)
test('shows the empty state for no points', ...)
test('exposes a summary label for TalkBack', ...)  // getByLabelText(<label passed in>)
```

- [ ] **Step 2: Run** `pnpm test -- src/features/energy`. Expected: FAIL.
- [ ] **Step 3: Implement** hook, parts, `toChartData` and the jest mock. Parts read context with `use(EnergyChartContext)` and throw outside `EnergyChart`.
- [ ] **Step 4: Run** `pnpm test -- src/features/energy scripts/design-guard scripts/uniwind-guard`. Expected: PASS; no new colour literal and no change to `COLOUR_LITERAL_ALLOWED`.
- [ ] **Step 5: Gates** G1, G2, G3. Commit:

```bash
git commit -m "feat(energy): victory-native usage chart with token colours and empty state"
```

**Phase B review (reviewer, opus):** Tasks 3 to 5. Check no cross-feature imports (lint plus `rg "@/features/(devices|energy)" src/features`), context shape, render-prop use, zero and empty handling, no hex or new `rgb(`, mock parse at load. An implementer fix wave follows.

---

## Phase C: screens, routes, docs

### Task 6: Screens: Home (composed), Devices, Energy, Settings (base checks moved)

**Model:** implementer (sonnet).

**Files:**
- Rewrite: `src/screens/home/index.tsx`, `src/screens/home/home.test.tsx`
- Create: `src/screens/home/greeting.ts` and `greeting.test.ts`; `src/features/devices/screens/devices-screen.tsx` and test; `src/features/energy/screens/energy-screen.tsx` and test
- Move (`git mv`): `src/screens/home/sample-form.tsx` and test to `src/screens/settings/`; the base-check body (theme picker, SampleForm, SecureStore check, Modal) into `src/screens/settings/index.tsx`; its modal test into `src/screens/settings/settings.test.tsx`
- Modify: `en.json` and `vi.json`. Base-check `home.*` keys move to `settings.*`, `settings.title` = "Settings". New `home.*` keys: `home.greeting.morning|afternoon|evening`, `home.currentDraw`, `home.today`, `home.scenes.*`, `home.rooms`.

Planner's call, confirm with the user: the theme picker lives on today's base-check Home, so it moves to Settings with the rest of the base checks (so the docs' verified examples, form, modal, secure store, keep a home). No language switcher is added; language follows the device, as today.

**Interfaces:**
- Consumes: Task 3 (`useDeviceStates`, `groupByRoom`, `currentWatts`, `DeviceRow`, `RoomSection`, `RoomSummaryCard`) and Tasks 4/5 (`useEnergySummary`, `UsageSummaryCard`, `TopDevicesList`, `EnergyRangeSwitch`, `EnergyChart*`, `topN`, `totalKwh`).
- Produces:

```ts
export function greetingKey(hour: number): 'home.greeting.morning' | 'home.greeting.afternoon' | 'home.greeting.evening';
// 5-11 morning, 12-17 afternoon, else evening
export function Home(): ReactNode;           // src/screens/home
export function DevicesScreen(): ReactNode;  // ScrollView of RoomSection > DeviceRow (bounded list; ScrollView allowed)
export function EnergyScreen(): ReactNode;   // range useState('day'), EnergyRangeSwitch, EnergyChart, UsageSummaryCard, TopDevicesList
export function Settings(): ReactNode;       // base checks, unchanged behaviour
```

Home: greeting; current draw (`currentWatts` of provider state); today's usage and cost (`useEnergySummary('day')`); quick scenes (local `useState` selection, Buttons `variant` default/outline, `accessibilityState={{ selected }}`, no device side effects); up to 3 `RoomSummaryCard`s.

**Steps:**

- [ ] **Step 1: Write the failing tests.**

```ts
// greeting.test.ts
expect(greetingKey(6)).toBe('home.greeting.morning');
expect(greetingKey(13)).toBe('home.greeting.afternoon');
expect(greetingKey(22)).toBe('home.greeting.evening');
expect(greetingKey(0)).toBe('home.greeting.evening');

// home.test.tsx (under GluestackUIProvider + DeviceStatesProvider with a 2-device fixture)
test('current draw follows the provider state', ...)  // after toggling via a DeviceRow in the same tree, the text updates
test('selecting a scene marks it selected', ...)

// devices-screen.test.tsx
test('renders a header per room and one switch per device', ...) // headers >= rooms; switches = devicesMock.devices.length

// energy-screen.test.tsx
test('switching to week re-renders the chart with the week points', ...) // data length === energyMock.week.points.length

// settings.test.tsx (moved)
// exactly 1 header named en.settings.modalTitle; close-button test unchanged
```

- [ ] **Step 2: Run** `pnpm test -- src/screens src/features`. Expected: FAIL.
- [ ] **Step 3: Implement** screens and moves. Use `Heading` for titles and the type roles in `docs/design-system.md` section 3. Read the locale from `useTranslation().i18n.language` for `formatNumber`.
- [ ] **Step 4: Fixed-height check (Review Focus 5).** `rg -n "\bh-\d" src/features src/screens`. Expected: only the chart canvas `h-48`.
- [ ] **Step 5: Run** `pnpm test`. Expected: PASS.
- [ ] **Step 6: Gates** G1, G2, G3. Commit:

```bash
git commit -m "feat(screens): home dashboard, devices and energy screens; base checks move to settings"
```

### Task 7: Routes, NativeTabs, provider wiring, device verification

**Model:** implementer (sonnet).

**Files:**
- Create: `src/app/(devices)/_layout.tsx` and `devices.tsx`; `src/app/(energy)/_layout.tsx` and `energy.tsx` (copy the `(settings)` pattern: a Stack with a title from `tabs.*`)
- Modify: `src/app/_layout.tsx` (wrap `NativeTabs` in `DeviceStatesProvider`; triggers in order `(home)` `md="home"` `sf="house.fill"`; `(devices)` `md="devices"` `sf="lightbulb.fill"`; `(energy)` `md="bolt"` `sf="bolt.fill"`; `(settings)` unchanged. `md` names verified in `node_modules/expo-symbols/build/android/symbols.json`; `sf` names checked by tsc), `src/app/(settings)/_layout.tsx` (title unchanged), `en.json` and `vi.json` (`tabs.devices`, `tabs.energy`)

**Interfaces:**
- Consumes: `DeviceStatesProvider` (Task 3), `DevicesScreen`, `EnergyScreen`, `Home`, `Settings` (Task 6).
- Produces: routes `/devices` and `/energy`.

**Steps:**

- [ ] **Step 1: Routes and tabs.** `pnpm typecheck`. Expected: exit 0, typed routes included.
- [ ] **Step 2: G1, G2, G3.**
- [ ] **Step 3: Light screenshots.** G4 with `npx expo start --dev-client` (JS-only): Home, Devices, Energy, Settings.
- [ ] **Step 4: Dark theme (Review Focus 1).** Switch to dark in Settings; screenshot the same 4 tabs. Expected: bars, switch tracks, progress fills and badges visible on cards. Back to light must re-colour the chart without reload.
- [ ] **Step 5: 48 dp rows (Review Focus 4).** On Devices tap the far left of a row (the name): its switch flips. Tap an offline row: nothing changes. Return to Home: current draw changed.
- [ ] **Step 6: Vietnamese (Review Focus 3).** `adb -s emulator-5554 shell cmd locale set-app-locales com.dafoggo.wattprint.dev --locales vi` (Android 13+ per-app locale), relaunch, screenshot all tabs. Expected: vi copy, long names wrap, watts and switch visible, vi number separators. If `expo-localization` does not pick it up, report it and fall back to changing the emulator system language by hand. Restore with `--locales en`.
- [ ] **Step 7: Large font (Review Focus 5).** `adb -s emulator-5554 shell settings put system font_scale 2.0`, relaunch, screenshot all tabs. Expected: no clipped text; scene and range buttons wrap or grow. Restore `font_scale 1.0`.
- [ ] **Step 8: Logcat** after steps 3 to 7: no `E` lines. Stop Metro.
- [ ] **Step 9: Commit.** List screenshot paths in the commit body or task report.

```bash
git commit -m "feat(app): devices and energy tabs with shared device state"
```

### Task 8: Docs, skill, README, HANDOFF, docs-links NOT_PATHS

**Model:** implementer (sonnet). Steps 1 and 2 grep sweeps can go to scout (haiku).

**Files:** `AGENTS.md`, `README.md`, `docs/architecture.md`, `components.md`, `design-system.md`, `client-state.md`, `data-fetching.md`, `performance.md`, `docs/superpowers/HANDOFF.md`, `.claude/skills/wattprint-base/SKILL.md`, `references/*.md`, `evals/evals.json`, `scripts/docs-links.test.ts`. The global `gluestack-ui-v5` skill only if a rule it states changed; record it if untouched.

**Steps:**

- [ ] **Step 1: Re-point stale claims.** `rg -n "screens/home|sample-form|home/index|home\.test" --glob "*.md" --glob "!docs/superpowers/plans/**"`. Re-point every claim about the base checks (theme buttons, modal, `keyboardShouldPersistTaps`, `showModal`, SecureStore) to `src/screens/settings/...`; re-verify each `(verified: ...)`. Point-in-time records (`reports/2026-10-25-*`, `specs/2026-10-25-*`) only where docs-links fails; add a dated note instead of rewriting history.
- [ ] **Step 2: Placeholder role names.** Replace backticked slice role names with placeholders (`<feature>/api.ts`, `<feature>/queries.ts`, `<feature>/schemas.ts`) in `AGENTS.md`, `docs/data-fetching.md`, the `SKILL.md` router row, `references/data-fetching.md`, `references/architecture.md`, `evals/evals.json`. Remove `'api.ts'`, `'queries.ts'`, `'schemas.ts'` from `NOT_PATHS`; compare with `git diff HEAD -- scripts/docs-links.test.ts` and keep only entries current records require. Verify `pnpm test -- scripts/docs-links`: PASS.
- [ ] **Step 3: Remove the stale image-row backlog mention** (its file was deleted): `HANDOFF.md` "Open items", `README.md` "Open items", `docs/performance.md` section 3 last bullet (keep the "Not measured" fact). Verify with `rg -n -i "image-row|image rows on a" AGENTS.md README.md docs/superpowers/HANDOFF.md docs/performance.md`: only measurement caveats in `performance.md` section 2 remain.
- [ ] **Step 4: Content updates** (each claim labelled `(verified: <file>)` or `(opinion)`):
  - `architecture.md`: `devices` and `energy` exist as mock-backed slices with no `api.ts`/`queries.ts` yet; `mock-data.ts` and `*-selectors.ts` are allowed extra files; the shared provider is mounted in the root layout.
  - `components.md`: section 1 `createContext` now exists (`device-states.tsx`, `energy-chart.tsx`); section 5 add the victory-native `CartesianChart` render prop; section 7 add the new vendored `forwardRef` files; state vendored boolean props are never used by our code.
  - `design-system.md`: usage subsections for Card, Switch (row is the target; colour bindings), Badge, Progress, Heading/Text, Divider, Pressable (`min-h-12` at call site) and the chart (colour from `useCSSVariable` + `toCssColor`, labels as RN Text); new `PAIRS` rows from the Task 2 report; update counts only if the section 3 grep is re-run.
  - `client-state.md`: the "Draft or toggle" row adds the lifted provider example; base-check paths move to settings.
  - `AGENTS.md`: the last EAS bullet about the base-check first tab says Home is the dashboard and base checks are in `src/screens/settings`.
  - `README.md`: Structure, Pinned versions (Skia, victory-native, html-elements from `pnpm list --depth 0`), gluestack decision (done in Task 2; check it). Also replace the README lines that call the CLI problem a deliberate Uniwind gap: gluestack's docs support `--uniwind`; the CLI misclassified the project (verified: https://gluestack.io/ui/docs/home/getting-started/cli, README history); cause not found.
  - Skill digests mirror the doc changes; add one eval "Add a device row with a switch" expecting a full-row 48 dp target and no cross-feature import.
- [ ] **Step 5: HANDOFF.** Under "Goals and status" add "Smarthome UI demo (mock data) done" linking the Task 9 report; "Next" becomes the backend contract or real data for `devices`/`energy`.
- [ ] **Step 6: Gates** G1 and G2 (the docs-links test is part of G1). Commit:

```bash
git commit -m "docs: record smarthome demo parts, slices and rules; placeholder slice role names"
```

### Task 9: Final verification and report

**Model:** implementer (sonnet), then reviewer (opus).

**Files:** Create `docs/superpowers/reports/2026-10-26-smarthome-ui-demo.md` (template in `reports/README.md`); modify `docs/superpowers/reports/README.md` (index).

**Steps:**

- [ ] **Step 1: Fresh build.** From a clean tree run G1, G2, G3; then `pnpm android` and the full G4 pass over the 4 tabs in light and dark. Paste real outputs.
- [ ] **Step 2: Write the report.** Sections: Status, What exists, Review outcome, Decisions and deviations, Deferred, Next. Decisions must include: Skia peer mismatch (Task 1 outcome), vendored part deviations, base checks moved to Settings, no language switcher, scenes without side effects, `src/lib/format.ts` created up front. Deferred: a `backlog/` file only for real open items (e.g. per-app locale if Task 7 step 6 used the fallback). List the docs changed.
- [ ] **Step 3: Commit.**

```bash
git commit -m "docs(report): smarthome UI demo"
```

**Phase C and final review (reviewer, opus):** Tasks 6 to 9 and the whole branch. Check Review Focus evidence (dark, vi and font 2.0 screenshots; tests for 48 dp and zero data), docs against code, `NOT_PATHS`, gate outputs. One implementer fix wave, then the user decides on merge.
