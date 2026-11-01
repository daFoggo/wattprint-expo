import { useMutation } from '@tanstack/react-query';

import type { SignUpInput } from '@/features/auth/schemas';
import { authService } from '@/lib/auth-client';
import { primeAccessToken } from '@/lib/session';
import { useAuthStore } from '@/stores/auth-store';

export function useSignUp() {
  return useMutation({
    mutationFn: async (input: SignUpInput) => {
      const { accessToken, user } = await authService.signUp(input);
      primeAccessToken(accessToken);
      useAuthStore.getState().setSignedIn(user);
      return user;
    },
  });
}
