import type { z } from 'zod';

import { userSchema } from '@/lib/auth-service';

export const meSchema = userSchema;
export type Me = z.output<typeof meSchema>;
