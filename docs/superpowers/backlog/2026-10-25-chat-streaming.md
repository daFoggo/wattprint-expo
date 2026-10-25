# Chat streaming

Opened: 2026-10-25. Source: `docs/data-fetching.md` "Not decided yet", the data-architecture spec.

## Why it matters

The planned chatbot streams tokens from the FastAPI backend; React Native has no built-in `EventSource`.

## Facts (measured or verified)

- Planned design (spec): `res.body.getReader()` with `TextDecoder`, an own SSE parser unit-tested with fixtures, abort through
  `AbortController`, in-flight tokens in feature state, the final message written with `setQueryData`; the chat list is a
  FlashList v2 with `maintainVisibleContentPosition` and `startRenderingFromBottom`.
- Nothing of this is built or measured; the spec marks the `AbortController` abort behaviour as "to confirm on the emulator".

## Ideas (not verified)

- Idea: keep the parser a pure function in the feature so it can be tested without a device.
- Unverified: that `fetch` response streaming works for the backend media type on Hermes in a release build.

## Start when

The chat feature starts and the backend exposes a streaming endpoint (check its `/openapi.json`).

## Done when

Parser tests pass with fixtures (partial chunks, multi-byte split, error event), an abort stops the stream on the emulator, a
long conversation scrolls without jank (measured per `docs/performance.md` section 8), and the final message is in the cache.

## Docs touched

`docs/data-fetching.md`, `docs/performance.md`, `docs/components.md` (message list rows), a spec and a report.
