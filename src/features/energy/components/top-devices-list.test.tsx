import { render, screen } from '@testing-library/react-native';

import '@/i18n';

import { TopDevicesList } from './top-devices-list';

const devices = [
  { deviceId: 'a', name: 'Heater', kwh: 3 },
  { deviceId: 'b', name: 'Lamp', kwh: 1 },
];

// The progress fill writes `width: '<value>%'` into its style (see progress.test.tsx).
const tree = () => JSON.stringify(screen.toJSON());

test('renders 0% bars when total is 0', async () => {
  await render(<TopDevicesList devices={devices} total={0} />);
  expect(tree()).not.toContain('NaN');
  expect(tree()).toContain('"width":"0%"');
});

test('fills each bar to its share of the total', async () => {
  await render(<TopDevicesList devices={devices} total={4} />);
  expect(tree()).toContain('"width":"75%"');
  expect(tree()).toContain('"width":"25%"');
});

test('each bar is labelled with the device name and share', async () => {
  await render(<TopDevicesList devices={devices} total={4} />);
  expect(screen.getByLabelText('Heater: 75% of total')).toBeTruthy();
  expect(screen.getByLabelText('Lamp: 25% of total')).toBeTruthy();
});
