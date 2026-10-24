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
