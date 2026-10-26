import type { Device, Room } from './schemas';

export type RoomGroup = { room: Room; devices: Device[] };

// Room order is kept, and rooms without devices stay in the result.
export function groupByRoom(rooms: Room[], devices: Device[]): RoomGroup[] {
  return rooms.map((room) => ({ room, devices: devices.filter((d) => d.roomId === room.id) }));
}

export function currentWatts(devices: Device[]): number {
  return devices.reduce((sum, d) => (d.on && d.status === 'online' ? sum + d.watts : sum), 0);
}

export function countOn(devices: Device[]): number {
  return devices.filter((d) => d.on).length;
}
