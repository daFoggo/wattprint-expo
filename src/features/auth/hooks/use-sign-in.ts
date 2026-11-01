import { useMutation } from '@tanstack/react-query';

import type { SignInInput } from '@/features/auth/schemas';
import { authService } from '@/lib/auth-client';
import { useAuthStore } from '@/stores/auth-store';

export function useSignIn() {
  return useMutation({
    mutationFn: async (input: SignInInput) => {
      const { user } = await authService.signIn(input);
      useAuthStore.getState().setSignedIn(user);
      return user;
    },
  });
}
