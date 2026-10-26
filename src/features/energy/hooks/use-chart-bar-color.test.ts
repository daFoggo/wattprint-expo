import { renderHook } from '@testing-library/react-native';
import { useCSSVariable } from 'uniwind';

import { useChartBarColor } from './use-chart-bar-color';

jest.mock('uniwind', () => ({ ...jest.requireActual('uniwind'), useCSSVariable: jest.fn() }));

const mockVariable = jest.fn<string | number | undefined, []>();
jest.mocked(useCSSVariable).mockImplementation(mockVariable as never);

test('light primary triple becomes a CSS colour', async () => {
  mockVariable.mockReturnValue('23 23 23');
  const { result } = await renderHook(() => useChartBarColor());
  expect(result.current).toBe('rgb(23, 23, 23)');
});

test('dark primary triple becomes a CSS colour', async () => {
  mockVariable.mockReturnValue('255 245 245');
  const { result } = await renderHook(() => useChartBarColor());
  expect(result.current).toBe('rgb(255, 245, 245)');
});

test('returns null when the variable is missing', async () => {
  mockVariable.mockReturnValue(undefined);
  const { result } = await renderHook(() => useChartBarColor());
  expect(result.current).toBeNull();
});
