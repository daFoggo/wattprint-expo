import { create } from 'zustand';

import type { AuthUser } from '@/lib/auth-service';

export type AuthStatus = 'unknown' | 'signedIn' | 'signedOut';

type AuthState = {
  status: AuthStatus;
  user: AuthUser | null;
  setSignedIn: (user?: AuthUser | null) => void;
  setSignedOut: () => void;
};

// In memory only, never persisted: the refresh token in SecureStore is the source of truth and the
// store is rebuilt from it at start (`bootstrapAuth`). It is user scoped: sign-out resets it.
export const useAuthStore = create<AuthState>()((set) => ({
  status: 'unknown',
  user: null,
  setSignedIn: (user = null) => set({ status: 'signedIn', user }),
  setSignedOut: () => set({ status: 'signedOut', user: null }),
}));
