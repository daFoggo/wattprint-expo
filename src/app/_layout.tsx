import '../global.css';
import '@/i18n';

import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { DeviceStatesProvider } from '@/features/devices/device-states';
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

  return (
    <GluestackUIProvider mode={theme}>
      <StatusBar style="auto" />
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={navTheme}>
          <DeviceStatesProvider>
            <NativeTabs>
              <NativeTabs.Trigger name="(home)">
                <NativeTabs.Trigger.Label>{t('tabs.home')}</NativeTabs.Trigger.Label>
                <NativeTabs.Trigger.Icon md="home" sf="house.fill" />
              </NativeTabs.Trigger>
              <NativeTabs.Trigger name="(devices)">
                <NativeTabs.Trigger.Label>{t('tabs.devices')}</NativeTabs.Trigger.Label>
                <NativeTabs.Trigger.Icon md="devices" sf="lightbulb.fill" />
              </NativeTabs.Trigger>
              <NativeTabs.Trigger name="(energy)">
                <NativeTabs.Trigger.Label>{t('tabs.energy')}</NativeTabs.Trigger.Label>
                <NativeTabs.Trigger.Icon md="bolt" sf="bolt.fill" />
              </NativeTabs.Trigger>
              <NativeTabs.Trigger name="(settings)">
                <NativeTabs.Trigger.Label>{t('tabs.settings')}</NativeTabs.Trigger.Label>
                <NativeTabs.Trigger.Icon md="settings" sf="gearshape.fill" />
              </NativeTabs.Trigger>
            </NativeTabs>
          </DeviceStatesProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </GluestackUIProvider>
  );
}
