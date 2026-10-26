import { z } from 'zod';

export const deviceTypeSchema = z.enum([
  'light',
  'ac',
  'fridge',
  'tv',
  'washer',
  'water_heater',
  'plug',
]);

export const deviceSchema = z.object({
  id: z.string(),
  roomId: z.string(),
  name: z.string().min(1),
  type: deviceTypeSchema,
  on: z.boolean(),
  watts: z.number().nonnegative(),
  status: z.enum(['online', 'offline']),
});

export const roomSchema = z.object({ id: z.string(), name: z.string().min(1) });

export const devicesResponseSchema = z.object({
  rooms: z.array(roomSchema),
  devices: z.array(deviceSchema),
});

export type Device = z.infer<typeof deviceSchema>;
export type Room = z.infer<typeof roomSchema>;
export type DevicesResponse = z.infer<typeof devicesResponseSchema>;
