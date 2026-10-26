import { energyMock } from '@/features/energy/mock-data';
import type { EnergyRange, EnergySummary } from '@/features/energy/schemas';

// Sync, from the mock; callers do not change when this becomes a query.
export function useEnergySummary(range: EnergyRange): EnergySummary {
  return energyMock[range];
}
