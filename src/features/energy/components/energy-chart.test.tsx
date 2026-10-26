import { render, screen } from '@testing-library/react-native';

import '@/i18n';
import en from '@/i18n/locales/en.json';
import type { UsagePoint } from '@/features/energy/schemas';

import { EnergyChart, EnergyChartAxis, EnergyChartBars, toChartData } from './energy-chart';

jest.mock('@/features/energy/hooks/use-chart-bar-color', () => ({
  useChartBarColor: () => 'rgb(23, 23, 23)',
}));

const at = '2026-10-26T10:00:00.000Z';
const usage: UsagePoint[] = [
  { at, kwh: 0 },
  { at, kwh: 2 },
  { at, kwh: 1 },
];

const chart = (points: UsagePoint[]) => (
  <EnergyChart points={points} accessibilityLabel="Usage summary">
    <EnergyChartBars />
  </EnergyChart>
);

test('maps points to x index and kWh', () => {
  expect(toChartData(usage)).toEqual([
    { x: 0, kwh: 0 },
    { x: 1, kwh: 2 },
    { x: 2, kwh: 1 },
  ]);
});

test('mounts the chart with one datum per point when there is usage', async () => {
  await render(chart(usage));
  expect(screen.getByTestId('cartesian-chart').props.data).toHaveLength(usage.length);
});

test('shows the empty state and no chart when all points are zero', async () => {
  await render(
    chart([
      { at, kwh: 0 },
      { at, kwh: 0 },
    ]),
  );
  expect(screen.queryByTestId('cartesian-chart')).toBeNull();
  expect(screen.getByText(en.energy.noUsageTitle)).toBeTruthy();
});

test('shows the empty state for no points', async () => {
  await render(chart([]));
  expect(screen.queryByTestId('cartesian-chart')).toBeNull();
  expect(screen.getByText(en.energy.noUsageTitle)).toBeTruthy();
});

test('exposes a summary label for TalkBack', async () => {
  await render(chart(usage));
  expect(screen.getByLabelText('Usage summary')).toBeTruthy();
});

test('renders the axis labels as text', async () => {
  await render(
    <EnergyChart points={usage} accessibilityLabel="x">
      <EnergyChartAxis labels={['00:00', '12:00', '23:00']} />
    </EnergyChart>,
  );
  expect(screen.getByText('12:00')).toBeTruthy();
});

test('renders no axis for fewer than two labels', async () => {
  await render(
    <EnergyChart points={usage} accessibilityLabel="x">
      <EnergyChartAxis labels={['00:00']} />
    </EnergyChart>,
  );
  expect(screen.queryByText('00:00')).toBeNull();
});

test('renders no axis when there is no usage', async () => {
  await render(
    <EnergyChart points={[{ at, kwh: 0 }]} accessibilityLabel="x">
      <EnergyChartAxis labels={['00:00', '12:00', '23:00']} />
    </EnergyChart>,
  );
  expect(screen.queryByText('12:00')).toBeNull();
});

test('parts throw outside EnergyChart', async () => {
  const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
  await expect(render(<EnergyChartBars />)).rejects.toThrow();
  spy.mockRestore();
});
