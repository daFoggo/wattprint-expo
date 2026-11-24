# Review (lane M)

Base: 2e06571. R1 snapshot 22c2202, R2 snapshot c315456.

- R1 (sonnet): fix 1, 2. Should: stale docs (AGENTS.md, README, auth-service comments) and no test of the redirect
  against the build's scheme. Minor: `as string` cast; stale comment. All fixed in one pass (docs updated; test mocks
  `expo-constants` with `wattprint-dev` and asserts `wattprint-dev://auth`; missing scheme throws at load).
- R2 (sonnet, scoped): ship. Full `pnpm check` re-run after the load-time throw: green.
- Running Keycloak: `wattprint-mobile` redirect and post-logout URIs hold the three schemes (kcadm).
- Not checked: a device sign-in (no phone attached here); an `android/` prebuilt earlier keeps `wattprint://` until
  the next prebuild (documented in AGENTS.md).
