---
paths:
  - 'src/stores/**/*.ts'
---

# Client state (Zustand): rules an agent must not miss

Source of truth: docs/client-state.md.

- One store per concern in `src/stores/<name>-store.ts`; query data is never store state.
- Persisted stores set `version` and a `migrate`; changing a persisted shape without a bump silently merges the old shape.
- Select one value per selector or use `useShallow`; never `const s = useXStore()`.
- No tokens or large lists in MMKV. A store never imports a component, screen or feature.
- Tests that clear MMKV also reset the stores' in-memory state (and the reverse).
