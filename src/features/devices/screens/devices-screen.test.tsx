import { render, screen } from '@testing-library/react-native';

import '@/i18n';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { DeviceStatesProvider } from '@/features/devices/device-states';
import { devicesMock } from '@/features/devices/mock-data';

import { DevicesScreen } from './devices-screen';

test('renders a header per room and one switch per device', async () => {
  await render(
    <GluestackUIProvider>
      <DeviceStatesProvider>
        <DevicesScreen />
      </DeviceStatesProvider>
    </GluestackUIProvider>,
  );
  expect(screen.getAllByRole('header').length).toBeGreaterThanOrEqual(devicesMock.rooms.length);
  expect(screen.getAllByRole('switch')).toHaveLength(devicesMock.devices.length);
});
