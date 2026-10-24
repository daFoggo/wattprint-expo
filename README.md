# Wattprint

Expo SDK 58 base app (React Native 0.88, Expo Router with native tabs). It runs as an Android
development build; Expo Go is not supported.

## Requirements

- Node >= 22.13
- pnpm
- JDK 17
- Android SDK with an emulator or device, and `ANDROID_HOME` set
- SDK CMake 4.x installed (Windows long-path fix, see `docs/setup-notes.md`)

## Commands

```sh
pnpm install
pnpm android   # expo run:android: builds and launches the dev build
pnpm start     # starts Metro for an installed dev build
```

Setup notes and known issues: `docs/setup-notes.md`.
