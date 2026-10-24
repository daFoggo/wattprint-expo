import type { ConfigContext, ExpoConfig } from 'expo/config';

const APP_ENVS = ['development', 'preview', 'production'] as const;
type AppEnv = (typeof APP_ENVS)[number];

export default ({ config }: ConfigContext): ExpoConfig => {
  const appEnv = process.env.EXPO_PUBLIC_APP_ENV ?? 'development';
  if (!APP_ENVS.includes(appEnv as AppEnv)) {
    throw new Error(`Invalid EXPO_PUBLIC_APP_ENV: ${appEnv}`);
  }

  return {
    ...config,
    name: appEnv === 'production' ? 'Wattprint' : `Wattprint (${appEnv})`,
    slug: config.slug ?? 'wattprint-expo',
  };
};
