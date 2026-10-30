import { useEffect, useRef, useState } from 'react';

import { authClient } from '@/lib/auth-client';
import { clearUserScope } from '@/lib/session';

// How long the splash waits for the first session answer when no session is cached.
export const SESSION_WAIT_MS = 3000;

// What the root layout needs from the Better Auth session:
// - `ready`: render the navigator. True at once for a cached session (even while the refetch is
//   pending), true after the first answer or the timeout, and it never goes back to false, so a
//   later refetch cannot unmount the navigator and lose what the user typed.
// - `signedIn`: the guard for the (app) and (auth) route groups.
// It also drops the previous user's JWT and cached queries whenever the signed-in user changes.
export function useSessionGate(): { ready: boolean; signedIn: boolean } {
  const { data: session, isPending } = authClient.useSession();
  const [settled, setSettled] = useState(false);
  const userId = session?.user.id ?? null;
  const previousUserId = useRef(userId);

  const answered = !isPending || userId !== null;

  // Latch: once the session has been answered it stays answered (state set while rendering).
  if (answered && !settled) setSettled(true);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(true), SESSION_WAIT_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (previousUserId.current === userId) return;
    previousUserId.current = userId;
    clearUserScope();
  }, [userId]);

  return { ready: settled || answered, signedIn: userId !== null };
}
