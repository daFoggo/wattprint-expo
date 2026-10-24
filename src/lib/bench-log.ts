import { env } from '@/env';

// One greppable line per measurement: `adb -s emulator-5554 logcat -d -s ReactNativeJS:V | grep BENCH`.
// Silent in production builds (checked per call from the app env, not __DEV__: release-like
// benchmark builds are not `production` and must still log).
export function benchLog(entry: Record<string, unknown>): void {
  if (env.EXPO_PUBLIC_APP_ENV === 'production') return;
  console.log('[BENCH]', JSON.stringify(entry));
}
