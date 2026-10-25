import { render, screen } from '@testing-library/react-native';

import { Button, ButtonSpinner } from '.';

// Uniwind does not resolve classNames to props under Jest, so assert the binding reaches the host.
test('ButtonSpinner binds the spinner colour to the button variant', async () => {
  await render(
    <Button>
      <ButtonSpinner testID="spinner" />
    </Button>,
  );
  expect(screen.getByTestId('spinner').props.colorClassName).toBe('accent-primary-foreground');
});

test('destructive spinner uses the destructive foreground token', async () => {
  await render(
    <Button variant="destructive">
      <ButtonSpinner testID="spinner" />
    </Button>,
  );
  expect(screen.getByTestId('spinner').props.colorClassName).toBe('accent-destructive-foreground');
});

// Android guideline: touch targets are at least 48dp (Tailwind `min-h-12`; `lg` stays larger at
// `min-h-14`). Jest cannot resolve the class to a number, so assert whole class tokens on the host.
const classTokens = () => (screen.getByTestId('button').props.className as string).split(' ');

describe('Button touch target', () => {
  test.each([
    ['default', 'min-h-12'],
    ['sm', 'min-h-12'],
    ['lg', 'min-h-14'],
    ['icon', 'min-h-12'],
  ] as const)('size %s has %s', async (size, minHeight) => {
    await render(<Button testID="button" size={size} />);
    expect(classTokens()).toContain(minHeight);
  });

  test('icon buttons are at least 48dp wide', async () => {
    await render(<Button testID="button" size="icon" />);
    expect(classTokens()).toContain('min-w-12');
  });
});
