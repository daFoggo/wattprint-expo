import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import '@/i18n';
import { DeviceStatesProvider, useDeviceStates } from '@/features/devices/device-states';
import type { Device } from '@/features/devices/schemas';

import { DeviceRow } from './device-row';

const base: Device = {
  id: 'x',
  roomId: 'r1',
  name: 'Lamp',
  type: 'light',
  on: false,
  ratedWatts: 1500,
  status: 'online',
};

function Row({ id }: { id: string }) {
  const { state, actions } = useDeviceStates();
  const device = state.devices.find((d) => d.id === id);
  return device ? <DeviceRow device={device} onToggle={actions.toggle} /> : null;
}

const withProvider = (device: Device): ReactElement => (
  <DeviceStatesProvider initial={{ rooms: [{ id: 'r1', name: 'Room' }], devices: [device] }}>
    <Row id={device.id} />
  </DeviceStatesProvider>
);

test('the whole row is a 48dp switch target', async () => {
  await render(withProvider(base));
  const row = screen.getByRole('switch', { name: /^Lamp,/ });
  expect((row.props.className as string).split(' ')).toContain('min-h-12');
});

test('pressing the row toggles the device', async () => {
  await render(withProvider(base));
  expect(screen.getByRole('switch', { name: /^Lamp,/ }).props.accessibilityState.checked).toBe(
    false,
  );
  await fireEvent.press(screen.getByRole('switch', { name: /^Lamp,/ }));
  expect(screen.getByRole('switch', { name: /^Lamp,/ }).props.accessibilityState.checked).toBe(
    true,
  );
});

test('an offline device is disabled and does not toggle', async () => {
  await render(withProvider({ ...base, status: 'offline', on: true }));
  const row = screen.getByRole('switch', { name: /^Lamp,/ });
  expect(row.props.accessibilityState.disabled).toBe(true);
  await fireEvent.press(row);
  expect(screen.getByRole('switch', { name: /^Lamp,/ }).props.accessibilityState.checked).toBe(
    true,
  );
});

test('a long name wraps instead of pushing out the watts', async () => {
  const name = 'N'.repeat(80);
  await render(withProvider({ ...base, name, on: true }));
  const label = screen.getByText(name);
  expect(label.props.numberOfLines).toBeUndefined();
  expect(screen.getByText('1,500 W')).toBeTruthy();
});

test('the row label carries name, type, status and live watts', async () => {
  await render(withProvider({ ...base, on: true }));
  expect(screen.getByRole('switch', { name: 'Lamp, Light, Online, 1,500 W' })).toBeTruthy();
});

test('turning an off device on raises the row draw from 0 W', async () => {
  await render(withProvider(base));
  expect(screen.getByText('0 W')).toBeTruthy();
  await fireEvent.press(screen.getByRole('switch', { name: /^Lamp,/ }));
  expect(screen.getByText('1,500 W')).toBeTruthy();
});

test('turning an on device off drops the row draw to 0 W', async () => {
  await render(withProvider({ ...base, on: true }));
  await fireEvent.press(screen.getByRole('switch', { name: /^Lamp,/ }));
  expect(screen.getByText('0 W')).toBeTruthy();
  expect(screen.queryByText('1,500 W')).toBeNull();
});

test('the inner switch is hidden from accessibility', async () => {
  await render(withProvider(base));
  expect(
    screen.getByTestId('device-switch-wrap', { includeHiddenElements: true }).props
      .importantForAccessibility,
  ).toBe('no-hide-descendants');
});
