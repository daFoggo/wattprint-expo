# Design-system findings

Opened: 2026-10-25. Source: `docs/design-system.md` sections 2 and 5, found while writing it and in review. The Input and token items were fixed in
`fix/a11y-contrast-input` (see Done); the rest is under Remaining.

## Why it matters

Template colours and one component fall short of the guidelines the docs now state.

## Done (branch `fix/a11y-contrast-input`, 2026-10-25)

Ratios from `node scripts/contrast-report.js`; Jest guards them in `scripts/contrast.test.ts`.

- `Input` is `min-h-12` (48 dp), tested in `input.test.tsx`. No call site overrides it.
- `Input` border is `border-input`; `--input` is 148 light / 100 dark (was 229 / 46): 3.03:1 / 3.35:1 on `background`, 3.03:1 /
  3.03:1 on `card` (was 1.26 / 1.46). `--border` is unchanged (dividers). Other users of `--input`: the dark Input fill
  (`dark:bg-input/30`, placeholder 5.93:1, text 14.69:1) and the outline Button fill (`dark:bg-input/[0.045]` and `/[0.075]`,
  label 18.49:1 / 18.13:1); all pass.
- Light `--ring` is 115 (was 163): 4.74:1 on `background` (was 2.52); dark ring unchanged (4.18:1). A ring of exactly 3:1 (grey
  148) would equal the new light `--input` and give no focus change, so it was darkened further.
- The stale-note check: dark placeholder is 5.93:1 now (was 7.08:1 before `--input` darkened); `README.md` still lists it as a
  low-contrast limitation, see Remaining.

## Remaining

- Invalid Input border (`border-destructive/40`) is 2.11:1 light and 1.95:1 dark (needs 3:1). The error text below the field
  compensates; the finding stays open. Idea: raise the opacity, or accept the error text as the cue. Labelled in
  `KNOWN_FAILURES`.
- Light `muted-foreground` on `muted` is 4.35:1; only the pressed row (`active:bg-muted`) renders it. Low priority. Labelled in
  `KNOWN_FAILURES`.
- Dark `ring` (115) vs dark `input` (100) differ by little, so the focus step in dark is subtle (opinion; check on a device).
- `InputSlot` has no minimum size (no screen uses a slot).
- `README.md` "low-contrast dark input placeholder" known limitation: computed ratio passes, device check recorded in the
  fix branch report; confirm or remove.
- `Modal` animations set no explicit `reduceMotion`; whether they honour the system setting is unverified.
- Dark `destructive-foreground` on **solid** `destructive` is 2.77:1, but no class renders it (the dark destructive Button is
  `bg-destructive/60`). Nothing to fix; never put `text-destructive-foreground` on a solid `bg-destructive` in dark.
- Idea: a dev-only showcase screen rendering every token, variant and state (out of scope so far).

## Start when

A feature screen with forms is built, or before the first preview distribution.

## Done when

`node scripts/contrast-report.js` shows no FAIL for the pairs that are actually rendered (the invalid border and the pressed-row
`muted-foreground` stay labelled), the Modal reduce-motion behaviour is checked on the emulator with "Remove animations", the
`README.md` placeholder note is confirmed or removed. The Input 48 dp, boundary and ring items are done.

## Docs touched

`docs/design-system.md`, `README.md` (vendored deviations, known limitations), `docs/components.md` if variants change.
