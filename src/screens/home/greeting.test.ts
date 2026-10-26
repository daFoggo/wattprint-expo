import { greetingKey } from './greeting';

test('maps the hour to a greeting', () => {
  expect(greetingKey(6)).toBe('home.greeting.morning');
  expect(greetingKey(13)).toBe('home.greeting.afternoon');
  expect(greetingKey(22)).toBe('home.greeting.evening');
  expect(greetingKey(0)).toBe('home.greeting.evening');
  expect(greetingKey(5)).toBe('home.greeting.morning');
  expect(greetingKey(11)).toBe('home.greeting.morning');
  expect(greetingKey(12)).toBe('home.greeting.afternoon');
  expect(greetingKey(17)).toBe('home.greeting.afternoon');
  expect(greetingKey(18)).toBe('home.greeting.evening');
});
