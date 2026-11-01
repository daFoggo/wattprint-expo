import type { AuthStorage } from '@/lib/auth-service';

// Legacy: SecureStore keys written by the previous external auth service's client on installs that
// were upgraded from it (storage prefix `wattprint`): the cookie jar and the cached session, each
// possibly split into chunks. Nothing reads them any more.
const LEGACY_KEYS = ['wattprint_cookie', 'wattprint_session_data'];
const CHUNK_MARKER = 'ba-chunks:';
const MAX_CHUNKS = 100;

// A split value leaves a marker `ba-chunks:<count>[:<slot>[:<fallback count>]]` in its base key and the
// pieces in `<key>.<i>` or `<key>.<slot>.<i>`.
function chunkKeys(key: string, marker: string): string[] {
  const counts = marker
    .slice(CHUNK_MARKER.length)
    .split(':')
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0 && n <= MAX_CHUNKS);
  const most = Math.max(0, ...counts);
  const keys: string[] = [];
  for (let i = 0; i < most; i++) keys.push(`${key}.${i}`, `${key}.0.${i}`, `${key}.1.${i}`);
  return keys;
}

// Deletes the legacy keys. Idempotent (a missing key is a no-op) and never throws.
export async function removeLegacyAuthKeys(storage: AuthStorage): Promise<void> {
  for (const key of LEGACY_KEYS) {
    try {
      const base = await storage.get(key);
      if (base === null) continue;
      if (base.startsWith(CHUNK_MARKER)) {
        for (const chunk of chunkKeys(key, base)) {
          await storage.remove(chunk).catch(() => undefined);
        }
      }
      await storage.remove(key);
    } catch {
      // Best effort: stale data is harmless.
    }
  }
}
