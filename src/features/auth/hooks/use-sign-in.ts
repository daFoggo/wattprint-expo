import { useMutation } from '@tanstack/react-query';

import type { SignInInput } from '@/features/auth/schemas';
import { authService } from '@/lib/auth-client';
import { primeAccessToken } from '@/lib/session';
import { useAuthStore } from '@/stores/auth-store';

export function useSignIn() {
  return useMutation({
    mutationFn: async (input: SignInInput) => {
      const { accessToken, user } = await authService.signIn(input);
      primeAccessToken(accessToken);
      useAuthStore.getState().setSignedIn(user);
      return user;
    },
  });
}
