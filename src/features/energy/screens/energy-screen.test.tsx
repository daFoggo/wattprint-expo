import { fireEvent, render, screen } from '@testing-library/react-native';

import '@/i18n';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { energyMock } from '@/features/energy/mock-data';
import en from '@/i18n/locales/en.json';

import { EnergyScreen } from './energy-screen';

jest.mock('@/features/energy/hooks/use-chart-bar-color', () => ({
  useChartBarColor: () => 'rgb(23, 23, 23)',
}));

test('switching to week re-renders the chart with the week points', async () => {
  await render(
    <GluestackUIProvider>
      <EnergyScreen />
    </GluestackUIProvider>,
  );
  expect(screen.getByTestId('cartesian-chart').props.data).toHaveLength(
    energyMock.day.points.length,
  );
  await fireEvent.press(screen.getByText(en.energy.ranges.week));
  expect(screen.getByTestId('cartesian-chart').props.data).toHaveLength(
    energyMock.week.points.length,
  );
});
