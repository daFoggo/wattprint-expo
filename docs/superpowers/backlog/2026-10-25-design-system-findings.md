# Design-system findings

Opened: 2026-10-25. Source: `docs/design-system.md` sections 2 and 5, found while writing it. Not fixed there
(documentation only).

## Why it matters

Template colours and one component fall short of the guidelines the docs now state.

## Facts (measured or verified)

- `node scripts/contrast-report.js` (2026-10-25): dark `destructive-foreground` on `destructive` 2.77:1 (text needs 4.5);
  light `muted-foreground` on `muted` 4.35:1; `border` and `input` on `background` 1.26:1 light and 1.46:1 dark; `ring`
  2.52:1 light (UI parts need 3:1). The destructive Button in dark uses `dark:bg-destructive/60`, so its real pair was not
  computed.
- `Input` is `min-h-9` (36 dp) and `InputSlot` has no minimum, below the 48 dp Android guideline that `Button` already meets
  (verified: `src/components/ui/input/index.tsx`).
- `README.md` records a low-contrast dark input placeholder (known limitation).
- `Modal` animations set no explicit `reduceMotion`; whether they honour the system setting is unverified.

## Ideas (not verified)

- Idea: adjust `border` and `input` in light and the dark destructive pair, then re-run the script.
- Idea: raise `Input` to `min-h-12` like `Button` (a vendored-file deviation to record in `README.md`).
- Idea: a dev-only showcase screen rendering every token, variant and state (out of scope so far).
- Idea: extend `scripts/contrast-report.js` with alpha blends.

## Start when

A feature screen with forms is built, or before the first preview distribution.

## Done when

The script shows no FAIL for the pairs that carry text, `Input` meets 48 dp (test like `button.test.tsx`), the Modal
reduce-motion behaviour is checked on the emulator with "Remove animations", and the tables in `docs/design-system.md` are
updated.

## Docs touched

`docs/design-system.md`, `README.md` (vendored deviations), `docs/components.md` if variants change.
