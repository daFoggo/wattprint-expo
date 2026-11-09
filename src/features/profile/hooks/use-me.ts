import { useQuery } from '@tanstack/react-query';

import { meQuery } from '@/features/profile/queries';

export const useMe = () => useQuery(meQuery());
