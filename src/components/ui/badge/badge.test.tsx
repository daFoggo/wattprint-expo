import { render, screen } from '@testing-library/react-native';

import { Badge, BadgeText } from '.';

const classTokens = () => (screen.getByTestId('text').props.className as string).split(' ');

test('destructive BadgeText uses the destructive foreground token', async () => {
  await render(
    <Badge variant="destructive">
      <BadgeText testID="text">Offline</BadgeText>
    </Badge>,
  );
  expect(classTokens()).toContain('text-destructive-foreground');
  expect(classTokens()).not.toContain('text-white');
});
