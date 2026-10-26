import type { DeviceUsage, UsagePoint } from './schemas';

export function totalKwh(points: UsagePoint[]): number {
  return points.reduce((sum, p) => sum + p.kwh, 0);
}

export function hasUsage(points: UsagePoint[]): boolean {
  return points.some((p) => p.kwh > 0);
}

export function costOf(kwh: number, pricePerKwh: number): number {
  return kwh * pricePerKwh;
}

// Percentage 0..100; 0 when there is no total, so no NaN or Infinity reaches the UI.
export function shareOf(kwh: number, total: number): number {
  return total > 0 ? (kwh / total) * 100 : 0;
}

export function topN(devices: DeviceUsage[], n: number): DeviceUsage[] {
  return [...devices].sort((a, b) => b.kwh - a.kwh).slice(0, n);
}
