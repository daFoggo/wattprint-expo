# Font scale and dark Switch findings

Opened: 2026-10-26. Source: Task 7 device check of the smarthome UI demo (physical phone, light, dark, vi, font scale 2.0).

## Why it matters
Three small UI points were seen or left unchecked on the phone; none blocks the demo, each could surprise a user.

## Facts (measured or verified)
- At system font scale 2.0 the native bottom-tab labels truncate (Vietnamese "Trang c...", "Năng l..."). The tab bar is the native `NativeTabs`
  bar, which the app does not style (verified: Task 7 screenshots, `src/app/_layout.tsx` uses `NativeTabs`). Screen content does not clip.
- In dark mode the Switch thumb is `accent-card` (dark), so it has low contrast against the card; the track still tells on from off
  (verified: Task 7 dark screenshots). The thumb pairs `card` on `input` and `card` on `primary` pass 3:1 in `scripts/contrast-report.js`
  (3.03 and 16.76 in dark), but the thumb against the surrounding `card` was not computed.
- `Text` `isTruncated` uses `line-clamp-1` and no screen passes it, so it was never exercised on a device
  (verified: `README.md` "gluestack-ui", grep of `src` outside `components/ui`).

## Ideas (not verified)
- idea: shorter tab titles, or accept native truncation at the largest scale; a native tab bar offers no per-label font cap that we checked.
- idea: add a `PAIRS` row for the thumb against `card` (and `input` against `card`) and pick a thumb token that clears 3:1 in dark.
- unverified: that `line-clamp-1` truncates to one line with an ellipsis on a real `Text`; test with a long name before using `isTruncated`.

## Start when
A designer or owner reviews the dark Switch, or a screen first needs `isTruncated`, or tab labels are reported unreadable.

## Done when
- Screenshots at font scale 2.0 (vi) show readable tab labels, or the truncation is recorded as accepted.
- `node scripts/contrast-report.js` has the thumb-on-card pair and `scripts/contrast.test.ts` passes.
- A long name with `isTruncated` shows one line and an ellipsis on the phone.

## Docs touched
`docs/design-system.md` (section 2 table, Switch usage), `README.md` (gluestack decision, Switch binding note).
