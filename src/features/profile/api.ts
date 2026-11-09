import { apiClient } from '@/lib/session';

import { meSchema } from './schemas';

export const fetchMe = (signal?: AbortSignal) =>
  apiClient.request('/users/me', { schema: meSchema, signal });
