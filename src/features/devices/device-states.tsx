import { createContext, use, useState, type ReactNode } from 'react';

import { devicesMock } from './mock-data';
import type { Device, DevicesResponse, Room } from './schemas';

type DeviceStates = {
  state: { rooms: Room[]; devices: Device[] };
  actions: { toggle: (id: string) => void };
};

const DeviceStatesContext = createContext<DeviceStates | null>(null);

// Only this provider knows the state is a `useState`; a later query or store can replace it.
export function DeviceStatesProvider({
  children,
  initial = devicesMock,
}: {
  children: ReactNode;
  initial?: DevicesResponse;
}) {
  const [devices, setDevices] = useState(initial.devices);

  const toggle = (id: string) =>
    setDevices((current) =>
      current.map((d) => (d.id === id && d.status === 'online' ? { ...d, on: !d.on } : d)),
    );

  return (
    <DeviceStatesContext value={{ state: { rooms: initial.rooms, devices }, actions: { toggle } }}>
      {children}
    </DeviceStatesContext>
  );
}

export function useDeviceStates(): DeviceStates {
  const value = use(DeviceStatesContext);
  if (value === null) throw new Error('useDeviceStates must be used inside DeviceStatesProvider');
  return value;
}
