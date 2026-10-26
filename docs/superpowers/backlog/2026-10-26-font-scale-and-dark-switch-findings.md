# Font scale and dark Switch findings

Opened: 2026-10-26. Source: Task 7 device check of the smarthome UI demo (physical phone, light, dark, vi, font scale 2.0).

## Why it matters
Three small UI points were seen or left unchecked on the phone; none blocks the demo, each could surprise a user.

## Facts (measured or verified)
- At system font scale 2.0 the native bottom-tab labels truncate (Vietnamese "Trang c...", "Năng l..."). The tab bar is the native `NativeTabs`
  bar, which the app does not style (verified: Task 7 screenshots, `src/app/_layout.tsx` uses `NativeTabs`). Screen content does not clip.
- Dark Switch thumb: fixed on 2026-10-26 with the `--switch-thumb` token (dark thumb on `card` 4.36, on `primary` 3.85). The thumb on the off
  track stays 1.44 in dark by design (position and track vs card carry the state; verified: `node scripts/contrast-report.js`).
- `Text` `isTruncated` uses `line-clamp-1` and no screen passes it, so it was never exercised on a device
  (verified: `README.md` "gluestack-ui", grep of `src` outside `components/ui`).

## Ideas (not verified)
- idea: shorter tab titles, or accept native truncation at the largest scale; a native tab bar offers no per-label font cap that we checked.
- unverified: that `line-clamp-1` truncates to one line with an ellipsis on a real `Text`; test with a long name before using `isTruncated`.

## Start when
A screen first needs `isTruncated`, or tab labels are reported unreadable.

## Done when
- Screenshots at font scale 2.0 (vi) show readable tab labels, or the truncation is recorded as accepted.
- A long name with `isTruncated` shows one line and an ellipsis on the phone.

## Docs touched
`docs/design-system.md` (section 2 table, Switch usage), `README.md` (gluestack decision, Switch binding note).
