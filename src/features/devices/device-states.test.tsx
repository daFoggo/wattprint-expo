import { act, render, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { DeviceStatesProvider, useDeviceStates } from './device-states';
import type { DevicesResponse } from './schemas';

const initial: DevicesResponse = {
  rooms: [{ id: 'r1', name: 'Room' }],
  devices: [
    { id: 'on1', roomId: 'r1', name: 'A', type: 'light', on: true, watts: 5, status: 'online' },
    { id: 'off1', roomId: 'r1', name: 'B', type: 'light', on: true, watts: 5, status: 'offline' },
  ],
};

const wrapper = ({ children }: { children: ReactNode }) => (
  <DeviceStatesProvider initial={initial}>{children}</DeviceStatesProvider>
);

const isOn = (result: { current: ReturnType<typeof useDeviceStates> }, id: string) =>
  result.current.state.devices.find((d) => d.id === id)?.on;

test('toggle flips an online device', async () => {
  const { result } = await renderHook(() => useDeviceStates(), { wrapper });
  await act(() => result.current.actions.toggle('on1'));
  expect(isOn(result, 'on1')).toBe(false);
});

test('toggle ignores an offline device', async () => {
  const { result } = await renderHook(() => useDeviceStates(), { wrapper });
  await act(() => result.current.actions.toggle('off1'));
  expect(isOn(result, 'off1')).toBe(true);
});

test('useDeviceStates throws outside the provider', async () => {
  const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
  function Probe() {
    useDeviceStates();
    return null;
  }
  await expect(render(<Probe />)).rejects.toThrow();
  spy.mockRestore();
});
