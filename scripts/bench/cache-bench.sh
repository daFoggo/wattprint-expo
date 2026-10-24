#!/usr/bin/env bash
# Cache hit vs refetch benchmark. Usage: cache-bench.sh <runs> <out.csv> "<stale>:<delay>" ...
# Needs a build with the throwaway launch flags `stale=<ms>` (query staleTime) and `delay=<ms>`
# (dummyjson `delay` query param). Every run starts from a fresh process (empty query cache).
D=$(dirname "$0")
. "$D/common.sh"
runs=${1:-5}
out=${2:-cache-bench.csv}
shift 2
configs=${*:-"30000:0 0:0 30000:1000 0:1000"}
F="node "$D/bench-field.js""
echo "run,stale,delay,L_http,L_contentMs,L_resume_http,L_resume35_http,D1_http,D1_contentMs,D1_realMs,C_http,C_contentMs,C_placeholder,C_realMs,R_http,R_contentMs,R_placeholder,R_realMs" > "$out"

resume_app() {
  adbx shell input keyevent KEYCODE_HOME
  sleep 2
}
bring_back() {
  adbx shell am start -n "$PKG/.MainActivity" > /dev/null
}

for run in $(seq "${START:-1}" "$runs"); do
  for cfg in $configs; do
    stale=${cfg%%:*}
    delay=${cfg##*:}
    extra=$((delay / 1000))
    q="stale=$stale&delay=$delay"

    # L: products list, cold open, then return to the app within staleTime (and after 35 s).
    launch_url "wattprint://lab?$q" > /dev/null
    sleep $((6 + extra))
    lines=$(bench_lines)
    L_http=$(echo "$lines" | $F count http)
    L_ms=$(echo "$lines" | $F first products-content ms)
    adbx logcat -c
    resume_app
    bring_back
    sleep 5
    L_res=$(bench_lines | $F count http)
    L_res35=""
    if [ "$stale" = "30000" ] && [ "$delay" = "0" ]; then
      adbx logcat -c
      resume_app
      sleep 36
      bring_back
      sleep 5
      L_res35=$(bench_lines | $F count http)
    fi

    # D1: detail opened directly (no cached list row, so no placeholder).
    launch_url "wattprint://lab/1?$q" > /dev/null
    sleep $((6 + extra))
    lines=$(bench_lines)
    D1_http=$(echo "$lines" | $F count http)
    D1_ms=$(echo "$lines" | $F first detail-content ms)
    D1_real=$(echo "$lines" | $F first detail-real ms)

    # C: detail opened from a cached list (placeholder row), then closed and reopened.
    launch_url "wattprint://lab?$q" > /dev/null
    sleep $((6 + extra))
    adbx logcat -c
    open_url "wattprint://lab/1"
    sleep $((5 + extra))
    lines=$(bench_lines)
    C_http=$(echo "$lines" | $F count http)
    C_ms=$(echo "$lines" | $F first detail-content ms)
    C_ph=$(echo "$lines" | $F first detail-content placeholder)
    C_real=$(echo "$lines" | $F first detail-real ms)
    adbx logcat -c
    adbx shell input keyevent KEYCODE_BACK
    sleep 1
    open_url "wattprint://lab/1"
    sleep $((4 + extra))
    lines=$(bench_lines)
    R_http=$(echo "$lines" | $F count http)
    R_ms=$(echo "$lines" | $F first detail-content ms)
    R_ph=$(echo "$lines" | $F first detail-content placeholder)
    R_real=$(echo "$lines" | $F first detail-real ms)

    echo "$run,$stale,$delay,$L_http,$L_ms,$L_res,$L_res35,$D1_http,$D1_ms,$D1_real,$C_http,$C_ms,$C_ph,$C_real,$R_http,$R_ms,$R_ph,$R_real" | tee -a "$out"
  done
done
