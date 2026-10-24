import { QueryClient } from '@tanstack/react-query';

import { isRetryable } from './errors';

export const shouldRetry = (failureCount: number, error: unknown): boolean =>
  isRetryable(error) && failureCount < 2;

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: shouldRetry },
      mutations: { retry: 0 },
    },
  });
}

export const queryClient = createQueryClient();
