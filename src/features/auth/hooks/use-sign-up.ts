import { useMutation } from '@tanstack/react-query';

import { toAuthError } from '@/features/auth/auth-error';
import type { SignUpInput } from '@/features/auth/schemas';
import { authClient } from '@/lib/auth-client';

export function useSignUp() {
  return useMutation({
    mutationFn: async (input: SignUpInput) => {
      const { data, error } = await authClient.signUp.email(input);
      if (error) throw toAuthError(error);
      return data;
    },
  });
}
