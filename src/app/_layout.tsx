import '../global.css';
import '@/i18n';

import { env } from '@/env';
import { benchLog } from '@/lib/bench-log';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { useAppStateFocus } from '@/hooks/use-app-state-focus';
import { useNavTheme } from '@/hooks/use-nav-theme';
import { initOnlineManager } from '@/lib/online-manager';
import { queryClient } from '@/lib/query-client';
import { RouteError } from '@/screens/route-error';
import { usePreferencesStore } from '@/stores/preferences-store';

import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, type ErrorBoundaryProps } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Uniwind } from 'uniwind';

// Apply the stored theme before the first render so the first frame is not the wrong theme.
Uniwind.setTheme(usePreferencesStore.getState().theme);

// Make TanStack Query follow the device connectivity (pause offline, resume on reconnect).
initOnlineManager();

export function ErrorBoundary(props: ErrorBoundaryProps) {
  return <RouteError {...props} />;
}

export default function RootLayout() {
  const { t } = useTranslation();
  const theme = usePreferencesStore((s) => s.theme);
  const navTheme = useNavTheme();
  useAppStateFocus();
  // The lab tab is a throwaway trial: hidden in production builds, decided once on the first render.
  const [hideLab] = useState(() => env.EXPO_PUBLIC_APP_ENV === 'production');

  // Cold-start marker for the benchmarks: wall-clock time when the first tabs have mounted. Compare it
  // with the logcat timestamps (performance.now() is not since app start on RN 0.88).
  useEffect(() => {
    benchLog({ event: 'home-ready', epochMs: Date.now() });
  }, []);

  return (
    <GluestackUIProvider mode={theme}>
      <StatusBar style="auto" />
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={navTheme}>
          <NativeTabs>
            <NativeTabs.Trigger name="(home)">
              <NativeTabs.Trigger.Label>{t('tabs.home')}</NativeTabs.Trigger.Label>
              <NativeTabs.Trigger.Icon md="home" sf="house.fill" />
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="lab" hidden={hideLab}>
              <NativeTabs.Trigger.Label>{t('tabs.lab')}</NativeTabs.Trigger.Label>
              <NativeTabs.Trigger.Icon md="science" sf="flask.fill" />
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="(settings)">
              <NativeTabs.Trigger.Label>{t('tabs.settings')}</NativeTabs.Trigger.Label>
              <NativeTabs.Trigger.Icon md="settings" sf="gearshape.fill" />
            </NativeTabs.Trigger>
          </NativeTabs>
        </ThemeProvider>
      </QueryClientProvider>
    </GluestackUIProvider>
  );
}
