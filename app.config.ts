import type { ConfigContext, ExpoConfig } from 'expo/config';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { ENVS, applicationId } = require('./scripts/app-identity');

export default ({ config }: ConfigContext): ExpoConfig => {
  const appEnv = process.env.EXPO_PUBLIC_APP_ENV ?? 'development';
  if (!ENVS.includes(appEnv)) {
    throw new Error(`Invalid EXPO_PUBLIC_APP_ENV: ${appEnv}`);
  }

  // app.json holds the production identifier; other envs get a suffix so builds coexist on a device.
  return {
    ...config,
    name: appEnv === 'production' ? 'Wattprint' : `Wattprint (${appEnv})`,
    slug: config.slug ?? 'wattprint-expo',
    ios: {
      ...config.ios,
      bundleIdentifier: applicationId(config.ios?.bundleIdentifier, appEnv),
    },
    android: {
      ...config.android,
      package: applicationId(config.android?.package, appEnv),
    },
  };
};
