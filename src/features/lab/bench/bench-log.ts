// One greppable line per measurement: `adb -s emulator-5554 logcat -d -s ReactNativeJS:V | grep BENCH`.
export function benchLog(entry: Record<string, unknown>): void {
  console.log('[BENCH]', JSON.stringify(entry));
}
