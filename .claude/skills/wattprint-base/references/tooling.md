# Tooling and workflow digest

Use before installing a package, touching gluestack, reading env vars, verifying on a device, or changing a rule. Sources:
[AGENTS.md](../../../../AGENTS.md), [README.md](../../../../README.md), [docs/superpowers/HANDOFF.md](../../../../docs/superpowers/HANDOFF.md).

## Decision matrix

| Need                            | Pattern                                                                                                                                                  |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Add a dependency                | `npx expo install <pkg>`; never type a version from memory                                                                                               |
| Add a dev dependency on Windows | `pnpm add -D <pkg>` (`npx expo install ... -- --dev` misplaces it)                                                                                       |
| `@gluestack-ui/core`, `utils`   | Keep exact pins 5.0.15 and 5.0.6 (alpha dist-tags); install with `pnpm add`; never upgrade blindly                                                       |
| A new gluestack component       | Hand-copy from the Uniwind template with stable packages; never `gluestack-ui add` or `init` (forces NativeWind when `android/` exists, installs alphas) |
| Alpha components                | None: Tabs, Table, BottomSheet, Calendar, DateTimePicker, Skeleton, Grid, Liquid Glass, Image Viewer                                                     |
| Edit a vendored file            | Record the deviation in `README.md` (the 48 dp `Button` sizes and the modal `ZoomIn` edit are there)                                                     |
| `react-native-web`, `react-dom` | Required peers only; never import under `src/` (`scripts/config-guard.test.ts`)                                                                          |
| Env value                       | Static `process.env.EXPO_PUBLIC_X` in `src/env.ts`; destructuring is not inlined; never a secret                                                         |
| UI strings                      | i18n keys, same keys in `en` and `vi`; error text `selectable`                                                                                           |
| Commit                          | Conventional (commitlint, 100 chars); hooks run; never bypass                                                                                            |
| EAS                             | Never `eas build` or create credentials unless the user asks                                                                                             |

## Gates before "done"

`pnpm check` (lint with zero warnings, typecheck, jest), `pnpm format:check`, `npx expo-doctor`, and for UI or native work the
emulator: relaunch the dev build (`com.dafoggo.wattprint.dev`, `emulator-5554` only, never the physical phone), take a screenshot, read
`adb logcat -d ReactNativeJS:V *:S` for no `E` lines, then stop Metro. Report real output, failures included.

## Docs and this skill

Change the rule, its doc, `README.md` and this skill in one commit. `scripts/docs-links.test.ts` fails on a broken relative link, a
backticked repo path that does not exist, or a skill in the AGENTS.md routing table that is neither under `.claude/skills` nor listed as
global in that test. `.claude/skills` is tracked; only `.claude/worktrees/` and `.claude/settings.local.json` are git-ignored.
