#!/usr/bin/env bash
# Re-render counts (DEV build + Metro + throwaway render logging; Profiler only reports in development).
# Usage: rerender.sh <runs> <out.csv> <label>
# Each run: relaunch the dev app, open the products list, then one action per scenario (typing "phone"
# fast and slow, pull-to-refresh of unchanged data, tab switch away and back) and count the [BENCH] entries.
D=$(dirname "$0")
. "$D/common.sh"
runs=${1:-5}
out=${2:-rerender.csv}
label=${3:-run}
DEV_URL="wattprint://?__expo_url=http%3A%2F%2F10.0.2.2%3A8081&__expo_disable_onboarding=1&__expo_disable_fab=1&__expo_disable_auto_launch=1"
echo "run,label,scenario,http,screenRenders,rowRenders,listCommits" > "$out"

fresh() {
  adbx shell am force-stop "$PKG"
  sleep 2
  adbx shell "am start -p $PKG -a android.intent.action.VIEW -d '$DEV_URL'" > /dev/null
  sleep 14
  open_url "wattprint://lab"
  sleep 5
  adbx logcat -c
}
count() { # scenario run
  local lines
  lines=$(bench_lines)
  echo "$2,$label,$1,$(echo "$lines" | grep -c '"event":"http"'),$(echo "$lines" | grep -c '"event":"screen-render"'),$(echo "$lines" | grep -c '"event":"row-render"'),$(echo "$lines" | grep -c '"id":"products-list"')" | tee -a "$out"
}

for run in $(seq 1 "$runs"); do
  fresh
  adbx shell input tap 540 289; sleep 1; adbx logcat -c
  adbx shell input text phone; sleep 3
  count type-fast "$run"

  fresh
  adbx shell input tap 540 289; sleep 1; adbx logcat -c
  for c in p h o n e; do adbx shell input text $c; sleep 0.5; done
  sleep 3
  count type-slow "$run"

  fresh
  adbx shell input swipe 540 700 540 1700 400; sleep 4
  count pull-refresh "$run"

  fresh
  adbx shell input tap 900 2196; sleep 1.5
  adbx shell input tap 540 2196; sleep 2
  count tab-switch "$run"
done
