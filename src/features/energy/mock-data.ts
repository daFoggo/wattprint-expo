import { energySummarySchema, type EnergyRange, type EnergySummary } from './schemas';

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
const END = Date.UTC(2026, 9, 26, 23);

// Deterministic shape so screens and screenshots stay stable between runs.
const points = (count: number, stepMs: number, kwhAt: (i: number) => number) =>
  Array.from({ length: count }, (_, i) => ({
    at: new Date(END - (count - 1 - i) * stepMs).toISOString(),
    kwh: kwhAt(i),
  }));

const round = (value: number) => Math.round(value * 100) / 100;

// Night hours (0 to 5) are zero so the chart shows empty bars.
const dayKwh = (hour: number) =>
  hour < 6 ? 0 : round(0.3 + 0.9 * Math.abs(Math.sin((hour / 24) * Math.PI * 2 + 1)));

// Each range has its own list: a device cannot use more than the whole period's total.
const NAMES = [
  { deviceId: 'd9', name: 'Water heater' },
  { deviceId: 'd3', name: 'Air conditioner' },
  { deviceId: 'd4', name: 'Refrigerator' },
  { deviceId: 'd2', name: 'Smart TV' },
];
const topDevices = (kwh: number[]) => NAMES.map((n, i) => ({ ...n, kwh: kwh[i] }));

const base = { pricePerKwh: 2500, currency: 'VND' };

// Parsed at module load: a bad mock throws into the root ErrorBoundary.
export const energyMock: Record<EnergyRange, EnergySummary> = {
  day: energySummarySchema.parse({
    ...base,
    range: 'day',
    topDevices: topDevices([4.6, 3.9, 2.1, 0.8]),
    points: points(24, HOUR_MS, (i) => dayKwh(i)),
  }),
  week: energySummarySchema.parse({
    ...base,
    range: 'week',
    topDevices: topDevices([18.4, 14.2, 6.1, 2.3]),
    points: points(7, DAY_MS, (i) => round(6 + 3 * Math.abs(Math.sin(i * 1.3)))),
  }),
  month: energySummarySchema.parse({
    ...base,
    range: 'month',
    topDevices: topDevices([73.6, 56.8, 24.4, 9.2]),
    points: points(30, DAY_MS, (i) => round(5 + 4 * Math.abs(Math.sin(i * 0.7)))),
  }),
};
