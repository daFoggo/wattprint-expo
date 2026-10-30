import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';

import { CollapsingScrollView } from './collapsing-scroll-view';

const renderScreen = (props: Partial<React.ComponentProps<typeof CollapsingScrollView>> = {}) =>
  render(
    <GluestackUIProvider>
      <CollapsingScrollView title="Devices" {...props}>
        <Text>row</Text>
      </CollapsingScrollView>
    </GluestackUIProvider>,
  );

test('renders the content under one large title header', async () => {
  await renderScreen();
  expect(screen.getByText('row')).toBeTruthy();
  expect(screen.getAllByRole('header')).toHaveLength(1);
  expect(screen.getByRole('header')).toHaveTextContent('Devices');
});

// The compact bar repeats the title for sighted users only, so a screen reader hears it once.
test('hides the compact bar title from accessibility', async () => {
  await renderScreen();
  const bar = screen.getByTestId('collapsed-bar', { includeHiddenElements: true });
  expect(bar.props.importantForAccessibility).toBe('no-hide-descendants');
});

test('forwards the subtitle and keeps the caller onScroll', async () => {
  const onScroll = jest.fn();
  await renderScreen({ subtitle: '5 on', onScroll, testID: 'scroll' });
  expect(screen.getByText('5 on')).toBeTruthy();
  fireEvent.scroll(screen.getByTestId('scroll'), {
    nativeEvent: { contentOffset: { y: 80 } },
  });
  expect(onScroll).toHaveBeenCalledTimes(1);
});
