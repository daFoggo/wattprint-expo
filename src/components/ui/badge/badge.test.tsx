import { render, screen } from '@testing-library/react-native';

import { CloseIcon } from '@/components/ui/icon';
import { Badge, BadgeIcon, BadgeText } from '.';

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

test('destructive BadgeIcon uses the destructive foreground token', async () => {
  await render(
    <Badge variant="destructive">
      <BadgeIcon as={CloseIcon} {...{ testID: 'icon' }} />
    </Badge>,
  );
  const tokens = (screen.getByTestId('icon').props.className as string).split(' ');
  expect(tokens).toContain('text-destructive-foreground');
  expect(tokens).not.toContain('text-white');
});
