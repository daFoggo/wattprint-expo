import { useMutation } from '@tanstack/react-query';

import { signOutAndClear } from '@/lib/session';

export function useSignOut() {
  return useMutation({ mutationFn: signOutAndClear });
}
