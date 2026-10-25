# Query persistence spike

Opened: 2026-10-25. Source: `docs/data-fetching.md` "Not decided yet", `docs/benchmarks/2026-10-25-baseline.md`.

## Why it matters

Every cold launch refetches, so the first list view always waits for the network. Persisting a small part of the query
cache could show content at once.

## Facts (measured or verified)

- The cache is memory-only today: after every `force-stop` the list needed 1 request and showed content at about 0.96 s
  (baseline section 1, emulator, host network, n=5). No persister exists in the repo.
- Hydration cost from MMKV was **not measured**.
- Plan in the spec: `@tanstack/react-query-persist-client` with `createAsyncStoragePersister` over MMKV, `gcTime >= maxAge`,
  `buster` = app version, persist only small summaries (spec "Persistence").

## Ideas (not verified)

- Idea: the benefit is larger on a mobile network than on the emulator's host connection.
- Idea: only a read-mostly dashboard summary needs it; chat and long lists never.

## Start when

A real read-mostly screen exists (dashboard summary) so the spike measures real data.

## Done when

Hydration time and cold-to-content time with and without persistence are measured in a release build (method in
`docs/performance.md` section 8, n >= 5, median and range), `maxAge` and `buster` are set, and the decision is written in
`docs/data-fetching.md`.

## Docs touched

`docs/data-fetching.md`, `docs/performance.md`, `docs/client-state.md` (if a store changes), a report.
