#!/usr/bin/env bash
# Return-to-app benchmark (focus refetch). Usage: resume-bench.sh <runs> <out.csv> "<stale>:<waitSeconds>" ...
# Opens the products list (fresh process), presses HOME, waits <waitSeconds>, brings the app back and counts the
# http requests that follow. Needs the throwaway `stale=<ms>` launch flag.
D=$(dirname "$0")
. "$D/common.sh"
runs=${1:-5}
out=${2:-resume-bench.csv}
shift 2
configs=${*:-"30000:3 30000:36 0:3"}
echo "run,stale,awaySeconds,launch_http,resume_http" > "$out"
for run in $(seq 1 "$runs"); do
  for cfg in $configs; do
    stale=${cfg%%:*}
    away=${cfg##*:}
    launch_url "wattprint://lab?stale=$stale" > /dev/null
    sleep 6
    first=$(bench_lines | node "$D/bench-field.js" count http)
    adbx logcat -c
    adbx shell input keyevent KEYCODE_HOME
    sleep "$away"
    adbx shell am start -n "$PKG/.MainActivity" > /dev/null 2>&1
    sleep 5
    again=$(bench_lines | node "$D/bench-field.js" count http)
    echo "$run,$stale,$away,$first,$again" | tee -a "$out"
  done
done
