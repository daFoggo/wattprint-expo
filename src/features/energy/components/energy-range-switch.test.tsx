import { fireEvent, render, screen } from '@testing-library/react-native';

import '@/i18n';
import en from '@/i18n/locales/en.json';

import { EnergyRangeSwitch } from './energy-range-switch';

test('marks the selected range and reports a new one', async () => {
  const onChange = jest.fn();
  await render(<EnergyRangeSwitch value="day" onChange={onChange} />);
  expect(
    screen.getByRole('button', { name: en.energy.ranges.day }).props.accessibilityState.selected,
  ).toBe(true);
  expect(
    screen.getByRole('button', { name: en.energy.ranges.week }).props.accessibilityState.selected,
  ).toBe(false);
  await fireEvent.press(screen.getByRole('button', { name: en.energy.ranges.week }));
  expect(onChange).toHaveBeenCalledWith('week');
});
