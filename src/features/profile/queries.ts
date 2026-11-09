import { queryOptions } from '@tanstack/react-query';

import { fetchMe } from '@/features/profile/api';

export const profileKeys = { me: ['profile', 'me'] as const };

// staleTime 0: opening the screen always asks FastAPI, which is the point of this check.
export const meQuery = () =>
  queryOptions({
    queryKey: profileKeys.me,
    queryFn: ({ signal }) => fetchMe(signal),
    staleTime: 0,
  });
