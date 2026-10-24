import type { ErrorBoundaryProps } from 'expo-router';

import { ErrorState } from '@/components/states/error-state';

export function RouteError({ error, retry }: ErrorBoundaryProps) {
  return <ErrorState error={error} onRetry={() => void retry()} />;
}
