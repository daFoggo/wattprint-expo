import { useMutation } from '@tanstack/react-query';

import { toAuthError } from '@/features/auth/auth-error';
import type { SignInInput } from '@/features/auth/schemas';
import { authClient } from '@/lib/auth-client';

export function useSignIn() {
  return useMutation({
    mutationFn: async (input: SignInInput) => {
      const { data, error } = await authClient.signIn.email(input);
      if (error) throw toAuthError(error);
      return data;
    },
  });
}
