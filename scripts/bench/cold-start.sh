#!/usr/bin/env bash
# Cold start benchmark. Usage: cold-start.sh <runs> <out.csv>
# TotalTime/WaitTime come from `am start -S -W`; jsReadyMs is the app's `home-ready` epochMs minus the
# device epoch taken in the same adb shell right before the launch (same clock, so no host skew).
D=$(dirname "$0")
. "$D/common.sh"
runs=${1:-10}
out=${2:-cold-start.csv}
echo "run,totalTimeMs,waitTimeMs,jsReadyMs,displayedMs" > "$out"
for i in $(seq 1 "$runs"); do
  adbx shell am force-stop "$PKG"
  sleep 3
  adbx logcat -c
  res=$(adbx shell "date +%s%3N; am start -S -W -n $PKG/.MainActivity" | tr -d '\r')
  t0=$(echo "$res" | head -n 1)
  total=$(echo "$res" | sed -n 's/^TotalTime: //p')
  waitt=$(echo "$res" | sed -n 's/^WaitTime: //p')
  sleep 8
  ready=$(bench_lines | sed -n 's/.*"event":"home-ready","epochMs":\([0-9]*\).*/\1/p' | head -n 1)
  displayed=$(adbx logcat -d -s ActivityTaskManager:I | tr -d '\r' | sed -n 's/.*Displayed .*: +\(.*\)$/\1/p' | head -n 1)
  js=""
  if [ -n "$ready" ]; then js=$((ready - t0)); fi
  echo "$i,$total,$waitt,$js,$displayed" | tee -a "$out"
done
