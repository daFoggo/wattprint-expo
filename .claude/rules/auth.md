---
paths:
  - 'src/lib/auth-*.ts'
  - 'src/lib/session.ts'
  - 'src/lib/storage.ts'
  - 'src/lib/legacy-auth-storage.ts'
  - 'src/stores/auth-store.ts'
  - 'src/features/auth/**'
  - 'src/env.ts'
---

# Auth, storage, env: rules an agent must not miss

Source of truth: docs/client-state.md and docs/data-fetching.md. These paths are lane L (riskyPaths).

- Tokens live in SecureStore only, never MMKV or a store that persists. `react-native-mmkv` is imported only in `src/lib/storage.ts`.
- Logout clears SecureStore, MMKV and the stores' in-memory state together (client-state.md, logout section).
- `EXPO_PUBLIC_*` is read by static `process.env.EXPO_PUBLIC_X` in `src/env.ts` and is inlined in the bundle: never a secret.
- The refresh token rotates: a failed save must drop the spent token (see `auth-service.test.ts`).
- Auth is Keycloak OIDC through expo-auth-session; the credentials and `eas` are the user's, never the agent's.
