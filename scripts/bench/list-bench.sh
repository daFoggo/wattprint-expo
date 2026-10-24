#!/usr/bin/env bash
# FlashList vs FlatList benchmark. Usage: list-bench.sh <runs> <out.csv> [sizes...]
# Needs a build with the throwaway `prefetch=1` launch flag (quotes prefetched at start, so the bench
# screen logs cached=true and no network is in the numbers). Order alternates per run (odd: flash first).
D=$(dirname "$0")
. "$D/common.sh"
runs=${1:-5}
out=${2:-list-bench.csv}
shift 2
sizes=${*:-100 500 1000}
echo "run,impl,n,order,cached,firstLayoutMs,total,janky,jankyPct,p50,p90,p99,pssKb" > "$out"

one() { # run impl n order
  local run=$1 impl=$2 n=$3 order=$4
  launch_url "wattprint://lab?prefetch=1" > /dev/null
  sleep 7
  open_url "wattprint://lab/bench?impl=$impl&n=$n"
  sleep 5
  local lines cached layout
  lines=$(bench_lines)
  cached=$(echo "$lines" | sed -n "s/.*\"event\":\"bench-first-native-layout\".*\"cached\":\([a-z]*\).*/\1/p" | head -n 1)
  layout=$(echo "$lines" | sed -n 's/.*"event":"bench-first-native-layout".*"msSinceMount":\([0-9]*\).*/\1/p' | head -n 1)
  adbx shell dumpsys gfxinfo "$PKG" reset > /dev/null
  for _ in $(seq 1 10); do
    adbx shell input swipe 540 1800 540 300 80
    sleep 0.3
  done
  sleep 2
  local gfx total janky pct p50 p90 p99 pss
  gfx=$(adbx shell dumpsys gfxinfo "$PKG" | tr -d '\r')
  total=$(echo "$gfx" | sed -n 's/^Total frames rendered: //p')
  janky=$(echo "$gfx" | sed -n 's/^Janky frames: \([0-9]*\) .*/\1/p' | head -n 1)
  pct=$(echo "$gfx" | sed -n 's/^Janky frames: [0-9]* (\([0-9.]*\)%).*/\1/p' | head -n 1)
  p50=$(echo "$gfx" | sed -n 's/^50th percentile: \([0-9]*\)ms/\1/p')
  p90=$(echo "$gfx" | sed -n 's/^90th percentile: \([0-9]*\)ms/\1/p')
  p99=$(echo "$gfx" | sed -n 's/^99th percentile: \([0-9]*\)ms/\1/p')
  pss=$(adbx shell dumpsys meminfo "$PKG" | tr -d '\r' | sed -n 's/^ *TOTAL PSS: *\([0-9]*\).*/\1/p' | head -n 1)
  echo "$run,$impl,$n,$order,$cached,$layout,$total,$janky,$pct,$p50,$p90,$p99,$pss" | tee -a "$out"
}

for run in $(seq 1 "$runs"); do
  for n in $sizes; do
    if [ $((run % 2)) -eq 1 ]; then
      one "$run" flash "$n" 1
      one "$run" flat "$n" 2
    else
      one "$run" flat "$n" 1
      one "$run" flash "$n" 2
    fi
  done
done
