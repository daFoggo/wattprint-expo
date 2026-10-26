import { ScrollView } from 'react-native';

import { DeviceRow } from '@/features/devices/components/device-row';
import { RoomSection } from '@/features/devices/components/room-section';
import { groupByRoom } from '@/features/devices/device-selectors';
import { useDeviceStates } from '@/features/devices/device-states';

// A bounded list (a few dozen rows at most), so a ScrollView is enough.
export function DevicesScreen() {
  const { state, actions } = useDeviceStates();
  return (
    <ScrollView className="bg-background flex-1" contentContainerClassName="gap-4 p-4">
      {groupByRoom(state.rooms, state.devices).map(({ room, devices }) => (
        <RoomSection key={room.id} room={room}>
          {devices.map((device) => (
            <DeviceRow key={device.id} device={device} onToggle={actions.toggle} />
          ))}
        </RoomSection>
      ))}
    </ScrollView>
  );
}
