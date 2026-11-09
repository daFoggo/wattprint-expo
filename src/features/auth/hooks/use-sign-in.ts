import { useMutation } from '@tanstack/react-query';

import { authService } from '@/lib/auth-client';
import { primeAccessToken } from '@/lib/session';
import { useAuthStore } from '@/stores/auth-store';

// Opens the Keycloak login in the system browser. Resolves null when the user closes it.
export function useSignIn() {
  return useMutation({
    mutationFn: async () => {
      const result = await authService.signIn();
      if (!result) return null;
      primeAccessToken(result.accessToken);
      useAuthStore.getState().setSignedIn(result.user);
      return result.user;
    },
  });
}
