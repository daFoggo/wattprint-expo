import type { FetchStatus } from '@tanstack/react-query';

type StaleBannerQuery = {
  data: unknown;
  isPlaceholderData: boolean;
  isError: boolean;
  fetchStatus: FetchStatus;
};

// Rows from a previous query, a failed refresh or a paused refresh stay visible; say which.
// Returns an i18n key, or null when the visible data is current.
export function staleBanner(query: StaleBannerQuery) {
  if (query.data === undefined) return null;
  if (query.isPlaceholderData) return 'lab.products.updating';
  if (query.isError) return 'lab.products.refreshFailed';
  if (query.fetchStatus === 'paused') return 'lab.products.offlineBanner';
  return null;
}
