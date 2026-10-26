export type GreetingKey =
  'home.greeting.morning' | 'home.greeting.afternoon' | 'home.greeting.evening';

// 5 to 11 morning, 12 to 17 afternoon, everything else evening.
export function greetingKey(hour: number): GreetingKey {
  if (hour >= 5 && hour < 12) return 'home.greeting.morning';
  if (hour >= 12 && hour < 18) return 'home.greeting.afternoon';
  return 'home.greeting.evening';
}
