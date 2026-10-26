import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { RoundIconButton } from './round-icon-button';

test('is a labelled button that calls onPress', async () => {
  const onPress = jest.fn();
  await render(
    <RoundIconButton accessibilityLabel="Back" onPress={onPress}>
      <Text>x</Text>
    </RoundIconButton>,
  );
  fireEvent.press(screen.getByRole('button', { name: 'Back' }));
  expect(onPress).toHaveBeenCalledTimes(1);
});

// Android touch target: 48dp (Tailwind `h-12 w-12`); Jest cannot resolve classes, so assert the tokens.
test('is a 48dp circle on the card surface without a border or shadow', async () => {
  await render(
    <RoundIconButton testID="btn" accessibilityLabel="Back">
      <Text>x</Text>
    </RoundIconButton>,
  );
  const tokens = (screen.getByTestId('btn').props.className as string).split(' ');
  expect(tokens).toEqual(expect.arrayContaining(['h-12', 'w-12', 'rounded-full', 'bg-card']));
  expect(tokens.some((t) => t.startsWith('border') || t.startsWith('shadow'))).toBe(false);
});
