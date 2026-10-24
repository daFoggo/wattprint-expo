#!/usr/bin/env bash
# Shared settings for the benchmark scripts. emulator-5554 ONLY: never run adb without -s.
SER=emulator-5554
PKG=com.dafoggo.wattprint.dev
adbx() { MSYS_NO_PATHCONV=1 adb -s "$SER" "$@"; }

# Fresh process, nothing in memory. Optional first arg: deep link used as the launch URL.
launch_url() {
  adbx shell am force-stop "$PKG"
  sleep 2
  adbx logcat -c
  adbx shell am start -W -p "$PKG" -a android.intent.action.VIEW -d "'$1'" | tr -d '\r'
}

# Deep link into the running app (no force-stop).
open_url() {
  adbx shell am start -p "$PKG" -a android.intent.action.VIEW -d "'$1'" > /dev/null
}

# Dump the [BENCH] lines (and nothing else) of the current logcat buffer.
bench_lines() {
  adbx logcat -d -s ReactNativeJS:V | tr -d '\r' | grep '\[BENCH\]'
}
