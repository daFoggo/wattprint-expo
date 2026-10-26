import { z } from 'zod';

export const energyRangeSchema = z.enum(['day', 'week', 'month']);

export const usagePointSchema = z.object({ at: z.iso.datetime(), kwh: z.number().nonnegative() });

export const deviceUsageSchema = z.object({
  deviceId: z.string(),
  name: z.string().min(1),
  kwh: z.number().nonnegative(),
});

export const energySummarySchema = z.object({
  range: energyRangeSchema,
  points: z.array(usagePointSchema),
  topDevices: z.array(deviceUsageSchema),
  pricePerKwh: z.number().positive(),
  currency: z.string().length(3),
});

export type EnergyRange = z.infer<typeof energyRangeSchema>;
export type UsagePoint = z.infer<typeof usagePointSchema>;
export type DeviceUsage = z.infer<typeof deviceUsageSchema>;
export type EnergySummary = z.infer<typeof energySummarySchema>;
