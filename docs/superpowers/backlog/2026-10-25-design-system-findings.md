# Design-system findings

Opened: 2026-10-25. Source: `docs/design-system.md` sections 2 and 5, found while writing it and in review. Not fixed there
(documentation only; no app code or token change on that branch).

## Why it matters

Template colours and one component fall short of the guidelines the docs now state.

## Facts (measured or verified)

All ratios: `node scripts/contrast-report.js` (2026-10-25), WCAG 2.2 formula, alpha classes composited over their parent.

- `Input` is `min-h-9` (36 dp) and `InputSlot` has no minimum, below the 48 dp Android guideline that `Button` already meets
  (verified: `src/components/ui/input/index.tsx`).
- `Input` uses `border-border`, and `--input` equals `--border` (229 light, 46 dark): the control boundary is 1.26:1 light and
  1.46:1 dark (needs 3:1). Dividers may stay at that ratio, they are decorative.
- Light `ring` (focused input border) is 2.52:1 (needs 3:1); dark is 4.18:1.
- Invalid Input border (`border-destructive/40`) is 2.11:1 light and 1.95:1 dark; the error text below the field compensates.
- Light `muted-foreground` on `muted` is 4.35:1; only the pressed row (`active:bg-muted`) renders it. Low priority.
- Dark `destructive-foreground` on **solid** `destructive` is 2.77:1, but no class renders it: the dark destructive Button is
  `bg-destructive/60` (6.20:1 over `background`, 5.77:1 over `card`) and 7.76:1 pressed at `/50`. Nothing to fix; the rule is
  never to put `text-destructive-foreground` on a solid `bg-destructive` in dark.
- Dark input placeholder (`muted-foreground` on `input/30` over `background`) computes to 7.08:1. `README.md` still lists a
  "low-contrast dark input placeholder" as a known limitation: that note looks stale and is unverified on a device.
- `Modal` animations set no explicit `reduceMotion`; whether they honour the system setting is unverified.

## Ideas (not verified)

- Idea: make `Input` use `min-h-12` like `Button` (a vendored-file deviation to record in `README.md`).
- Idea: make `Input` use `border-input` and darken `--input` to a grey of at least 148 in light (3.03:1 on white) and at least 100
  in dark (3.35:1 on `background`); re-run the script (computed here for grey values only; the Input fill and other users of
  `--input`, such as the outline Button `dark:bg-input/[0.045]`, were not re-checked).
- Idea: darken light `--ring` to reach 3:1.
- Idea: raise the invalid border opacity, or accept the error text as the cue.
- Idea: a dev-only showcase screen rendering every token, variant and state (out of scope so far).

## Start when

A feature screen with forms is built, or before the first preview distribution.

## Done when

`node scripts/contrast-report.js` shows no FAIL for the pairs that are actually rendered (pairs nothing renders, such as dark
`destructive-foreground` on solid `destructive`, may stay and are labelled), `Input` meets 48 dp (test like `button.test.tsx`),
the Modal reduce-motion behaviour is checked on the emulator with "Remove animations", the stale `README.md` placeholder note
is confirmed or removed, and the tables in `docs/design-system.md` are updated.

## Docs touched

`docs/design-system.md`, `README.md` (vendored deviations, known limitations), `docs/components.md` if variants change.
