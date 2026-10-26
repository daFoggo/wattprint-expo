import { costOf, hasUsage, peakKwh, shareOf, topN, totalKwh } from './energy-selectors';
import { energyMock } from './mock-data';
import { energySummarySchema, type DeviceUsage, type EnergyRange } from './schemas';

const at = '2026-10-26T10:00:00.000Z';

test.each(['day', 'week', 'month'] as EnergyRange[])('the %s range of the mock parses', (range) => {
  const result = energySummarySchema.safeParse(energyMock[range]);
  expect(result.success).toBe(true);
  expect(energyMock[range].range).toBe(range);
});

test.each(['day', 'week', 'month'] as EnergyRange[])(
  'the %s top devices never use more than the range total',
  (range) => {
    const { topDevices, points } = energyMock[range];
    const sum = topDevices.reduce((acc, d) => acc + d.kwh, 0);
    expect(sum).toBeLessThanOrEqual(totalKwh(points));
  },
);

test('the day range has 24 hourly points including zero hours', () => {
  const { points } = energyMock.day;
  expect(points).toHaveLength(24);
  expect(points.some((p) => p.kwh === 0)).toBe(true);
  expect(hasUsage(points)).toBe(true);
});

test('totalKwh and hasUsage handle empty and zero input', () => {
  expect(totalKwh([])).toBe(0);
  expect(hasUsage([])).toBe(false);
  expect(
    hasUsage([
      { at, kwh: 0 },
      { at, kwh: 0 },
    ]),
  ).toBe(false);
  expect(
    totalKwh([
      { at, kwh: 1.5 },
      { at, kwh: 2 },
    ]),
  ).toBe(3.5);
});

test('shareOf never returns NaN', () => {
  expect(shareOf(5, 0)).toBe(0);
  expect(shareOf(1, 4)).toBe(25);
  expect(shareOf(5, 4)).toBe(100);
  expect(shareOf(-1, 4)).toBe(0);
});

test('peakKwh is the highest point and 0 for no points', () => {
  expect(peakKwh([])).toBe(0);
  expect(
    peakKwh([
      { at, kwh: 1 },
      { at, kwh: 2.5 },
    ]),
  ).toBe(2.5);
});

test('costOf multiplies by the price', () => {
  expect(costOf(2, 2500)).toBe(5000);
});

test('topN sorts by kWh and does not mutate', () => {
  const devices: DeviceUsage[] = [
    { deviceId: 'a', name: 'A', kwh: 1 },
    { deviceId: 'b', name: 'B', kwh: 3 },
    { deviceId: 'c', name: 'C', kwh: 2 },
  ];
  expect(topN(devices, 2).map((d) => d.deviceId)).toEqual(['b', 'c']);
  expect(devices.map((d) => d.deviceId)).toEqual(['a', 'b', 'c']);
});
