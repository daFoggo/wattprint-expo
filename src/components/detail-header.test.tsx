import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';

import { DetailHeader } from './detail-header';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, bottom: 0, left: 0, right: 0 }),
}));

const renderHeader = (props: React.ComponentProps<typeof DetailHeader>) =>
  render(
    <GluestackUIProvider>
      <DetailHeader {...props} />
    </GluestackUIProvider>,
  );

test('the back button is labelled and calls onBack', async () => {
  const onBack = jest.fn();
  await renderHeader({ onBack, backLabel: 'Back' });
  fireEvent.press(screen.getByRole('button', { name: 'Back' }));
  expect(onBack).toHaveBeenCalledTimes(1);
});

test('renders the title as a header and the trailing slot', async () => {
  await renderHeader({
    onBack: jest.fn(),
    backLabel: 'Back',
    title: 'Fridge',
    trailing: <Text>Settings</Text>,
  });
  expect(screen.getByRole('header')).toHaveTextContent('Fridge');
  expect(screen.getByText('Settings')).toBeTruthy();
});

test('has no header role when there is no title', async () => {
  await renderHeader({ onBack: jest.fn(), backLabel: 'Back' });
  expect(screen.queryByRole('header')).toBeNull();
});
