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

// Android guideline: touch targets are at least 48dp (Tailwind `min-h-12`). Jest cannot resolve the
// class to a number, so assert the class on the host Pressable.
describe('Button touch target', () => {
  test.each(['default', 'sm', 'lg', 'icon'] as const)(
    'size %s is at least 48dp tall',
    async (size) => {
      await render(
        <Button testID="button" size={size}>
          <ButtonSpinner />
        </Button>,
      );
      expect(screen.getByTestId('button').props.className).toContain('min-h-12');
    },
  );

  test('icon buttons are at least 48dp wide', async () => {
    await render(<Button testID="button" size="icon" />);
    expect(screen.getByTestId('button').props.className).toContain('min-w-12');
  });
});
