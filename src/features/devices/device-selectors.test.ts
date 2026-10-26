import { countOn, currentWatts, groupByRoom, liveWatts } from './device-selectors';
import { devicesMock } from './mock-data';
import { devicesResponseSchema, type Device } from './schemas';

const device = (patch: Partial<Device> & Pick<Device, 'id'>): Device => ({
  roomId: 'r1',
  name: 'Device',
  type: 'plug',
  on: true,
  ratedWatts: 10,
  status: 'online',
  ...patch,
});

test('mock data parses and every device points at an existing room', () => {
  expect(devicesResponseSchema.safeParse(devicesMock).success).toBe(true);
  const deviceIds = devicesMock.devices.map((d) => d.id);
  expect(new Set(deviceIds).size).toBe(deviceIds.length);
  const roomIds = devicesMock.rooms.map((r) => r.id);
  expect(new Set(roomIds).size).toBe(roomIds.length);
  for (const d of devicesMock.devices) expect(roomIds).toContain(d.roomId);
  expect(devicesMock.devices.some((d) => d.status === 'offline')).toBe(true);
  expect(devicesMock.devices.some((d) => d.name.length >= 40)).toBe(true);
  for (const d of devicesMock.devices) expect(d.ratedWatts).toBeGreaterThan(0);
});

test('currentWatts counts only devices that are on and online', () => {
  const devices = [
    device({ id: 'a', ratedWatts: 100 }),
    device({ id: 'b', ratedWatts: 50, on: false }),
    device({ id: 'c', ratedWatts: 25, status: 'offline' }),
  ];
  expect(currentWatts(devices)).toBe(100);
  expect(currentWatts([])).toBe(0);
});

test('liveWatts is the rated power only while on and online', () => {
  expect(liveWatts(device({ id: 'a', ratedWatts: 40 }))).toBe(40);
  expect(liveWatts(device({ id: 'b', ratedWatts: 40, on: false }))).toBe(0);
  expect(liveWatts(device({ id: 'c', ratedWatts: 40, status: 'offline' }))).toBe(0);
});

test('countOn counts devices that are on and online', () => {
  expect(countOn([device({ id: 'a' }), device({ id: 'b', on: false })])).toBe(1);
  expect(countOn([device({ id: 'a' }), device({ id: 'c', status: 'offline' })])).toBe(1);
});

test('groupByRoom keeps room order and empty rooms', () => {
  const rooms = [
    { id: 'r2', name: 'Two' },
    { id: 'r1', name: 'One' },
    { id: 'r3', name: 'Empty' },
  ];
  const groups = groupByRoom(rooms, [
    device({ id: 'a', roomId: 'r1' }),
    device({ id: 'b', roomId: 'r2' }),
  ]);
  expect(groups.map((g) => g.room.id)).toEqual(['r2', 'r1', 'r3']);
  expect(groups.map((g) => g.devices.map((d) => d.id))).toEqual([['b'], ['a'], []]);
});
