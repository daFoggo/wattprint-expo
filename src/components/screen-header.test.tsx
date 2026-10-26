import { render, screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';

import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';

import { ScreenHeader } from './screen-header';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, bottom: 0, left: 0, right: 0 }),
}));

const renderHeader = (props: React.ComponentProps<typeof ScreenHeader>) =>
  render(
    <GluestackUIProvider>
      <ScreenHeader {...props} />
    </GluestackUIProvider>,
  );

test('renders the title as a header', async () => {
  await renderHeader({ title: 'Devices' });
  expect(screen.getByRole('header')).toHaveTextContent('Devices');
});

test('renders the subtitle and the action when given', async () => {
  await renderHeader({ title: 'Devices', subtitle: '5 on', action: <Text>Add</Text> });
  expect(screen.getByText('5 on')).toBeTruthy();
  expect(screen.getByText('Add')).toBeTruthy();
});

test('omits the subtitle when none is given', async () => {
  await renderHeader({ title: 'Devices' });
  expect(screen.queryByTestId('screen-header-subtitle')).toBeNull();
});

// The native header is hidden, so the screen clears the status bar itself.
test('pads the top by the safe area inset', async () => {
  await renderHeader({ title: 'Devices' });
  const style = StyleSheet.flatten(screen.getByTestId('screen-header').props.style);
  expect(style.paddingTop).toBe(24);
});
