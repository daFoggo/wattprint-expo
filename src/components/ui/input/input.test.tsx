import { render, screen } from '@testing-library/react-native';

import { Input, InputField } from '.';

// Uniwind does not resolve classNames to props under Jest, so these tests assert the wiring:
// the accent- bindings reach the TextInput and `isInvalid` reaches the field's invalid state.
test('InputField binds TextInput colours through accent- classes', async () => {
  await render(
    <Input>
      <InputField testID="field" placeholder="you@example.com" />
    </Input>,
  );
  const props = screen.getByTestId('field').props;
  expect(props.placeholderTextColorClassName).toBe('accent-muted-foreground');
  expect(props.cursorColorClassName).toBe('accent-primary');
  expect(props.selectionHandleColorClassName).toBe('accent-primary');
  expect(props.selectionColorClassName).toBe('accent-primary/30');
  expect(props.underlineColorAndroidClassName).toBe('accent-transparent');
  expect(props.className).not.toMatch(/placeholder:/);
});

test('callers can override the default bindings', async () => {
  await render(
    <Input>
      <InputField testID="field" placeholderTextColorClassName="accent-destructive" />
    </Input>,
  );
  expect(screen.getByTestId('field').props.placeholderTextColorClassName).toBe(
    'accent-destructive',
  );
});

// 48 dp Android touch target (same rule as Button); the field is a filled `bg-secondary` surface without a resting
// border, and focus draws `border-ring` (see docs/design-system.md).
test('Input meets 48 dp, is filled and shows focus with the ring token', async () => {
  await render(
    <Input testID="root">
      <InputField />
    </Input>,
  );
  const className = screen.getByTestId('root').props.className as string;
  expect(className).toMatch(/(^| )min-h-12( |$)/);
  expect(className).not.toMatch(/min-h-9/);
  expect(className).toMatch(/(^| )bg-secondary( |$)/);
  expect(className).toMatch(/(^| )border-transparent( |$)/);
  expect(className).not.toMatch(/border-(input|border)( |$)/);
  expect(className).toMatch(/data-\[focus=true\]:border-ring/);
});

test('Input isInvalid reaches the field', async () => {
  await render(
    <Input isInvalid>
      <InputField testID="field" />
    </Input>,
  );
  expect(screen.getByTestId('field').props['data-invalid']).toBe('true');
  expect(screen.getByTestId('field').props['aria-invalid']).toBe(true);
});
