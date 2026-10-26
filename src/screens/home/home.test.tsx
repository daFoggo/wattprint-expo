import { fireEvent, render, screen } from '@testing-library/react-native';

import '@/i18n';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { DeviceRow } from '@/features/devices/components/device-row';
import { DeviceStatesProvider, useDeviceStates } from '@/features/devices/device-states';
import type { DevicesResponse } from '@/features/devices/schemas';
import en from '@/i18n/locales/en.json';

import { Home } from '.';

const fixture: DevicesResponse = {
  rooms: [{ id: 'r1', name: 'Hall' }],
  devices: [
    { id: 'a', roomId: 'r1', name: 'Lamp', type: 'light', on: true, watts: 10, status: 'online' },
    { id: 'b', roomId: 'r1', name: 'Heater', type: 'ac', on: true, watts: 90, status: 'online' },
  ],
};

function Rows() {
  const { state, actions } = useDeviceStates();
  return state.devices.map((d) => <DeviceRow key={d.id} device={d} onToggle={actions.toggle} />);
}

async function renderHome() {
  await render(
    <GluestackUIProvider>
      <DeviceStatesProvider initial={fixture}>
        <Home />
        <Rows />
      </DeviceStatesProvider>
    </GluestackUIProvider>,
  );
}

test('current draw follows the provider state', async () => {
  await renderHome();
  expect(screen.getByText('100 W')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Heater'));
  // The lamp row also reads 10 W, so the draw card makes two matches.
  expect(screen.getAllByText('10 W')).toHaveLength(2);
  expect(screen.queryByText('100 W')).toBeNull();
});

test('selecting a scene marks it selected', async () => {
  await renderHome();
  const scene = () => screen.getByRole('button', { name: en.home.scenes.away });
  expect(scene().props.accessibilityState).toMatchObject({ selected: false });
  await fireEvent.press(scene());
  expect(scene().props.accessibilityState).toMatchObject({ selected: true });
});
