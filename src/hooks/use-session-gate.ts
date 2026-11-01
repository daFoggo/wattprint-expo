import { useEffect, useRef, useState } from 'react';

import { bootstrapAuth, clearUserScope } from '@/lib/session';
import { useAuthStore } from '@/stores/auth-store';

// How long the splash waits for the stored session to be read (SecureStore) before giving up.
export const SESSION_WAIT_MS = 3000;

// What the root layout needs from the auth store:
// - `ready`: render the navigator. True once the stored refresh token has been looked up (the
//   answer is local, so it works offline) or after the timeout, and it never goes back to false,
//   so a later change cannot unmount the navigator and lose what the user typed.
// - `signedIn`: the guard for the (app) and (auth) route groups.
// It also drops the previous user's JWT and cached queries when a signed-in user is replaced or ends.
export function useSessionGate(): { ready: boolean; signedIn: boolean } {
  const status = useAuthStore((s) => s.status);
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const [settled, setSettled] = useState(false);

  const answered = status !== 'unknown';
  // Latch: once the session has been answered it stays answered (state set while rendering).
  if (answered && !settled) setSettled(true);

  useEffect(() => {
    void bootstrapAuth();
    const timer = setTimeout(() => setSettled(true), SESSION_WAIT_MS);
    return () => clearTimeout(timer);
  }, []);

  // undefined: not known yet. null: signed out. 'stored': signed in from the stored token, user not loaded.
  const scope =
    status === 'unknown' ? undefined : status === 'signedIn' ? (userId ?? 'stored') : null;
  const previousScope = useRef(scope);
  useEffect(() => {
    if (scope === undefined) return;
    const previous = previousScope.current;
    previousScope.current = scope;
    // Entering a session needs no cleanup: sign-out already cleared the scope.
    if (previous !== undefined && previous !== null && previous !== scope) clearUserScope();
  }, [scope]);

  return { ready: settled || answered, signedIn: status === 'signedIn' };
}
