import { render, screen } from '@testing-library/react-native';

import { Switch } from '.';

// Uniwind does not resolve classNames to props under Jest, so assert the bindings reach the host.
test('Switch binds track and thumb colours to tokens', async () => {
  await render(<Switch testID="switch" />);
  const props = screen.getByTestId('switch').props;
  expect(props.trackColorOnClassName).toBe('accent-primary');
  expect(props.trackColorOffClassName).toBe('accent-input');
  expect(props.thumbColorClassName).toBe('accent-switch-thumb');
});
