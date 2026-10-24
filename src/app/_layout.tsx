import '../global.css';
import '@/env';
import '@/i18n';

import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { useAppStateFocus } from '@/hooks/use-app-state-focus';
import { queryClient } from '@/lib/query-client';
import { usePreferencesStore } from '@/stores/preferences-store';

import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';
import { useColorScheme } from 'react-native';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = usePreferencesStore((s) => s.theme);
  useAppStateFocus();

  return (
    <GluestackUIProvider mode={theme}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <NativeTabs>
            <NativeTabs.Trigger name="index">
              <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
              <NativeTabs.Trigger.Icon md="home" sf="house.fill" />
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="settings">
              <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
              <NativeTabs.Trigger.Icon md="settings" sf="gearshape.fill" />
            </NativeTabs.Trigger>
          </NativeTabs>
        </ThemeProvider>
      </QueryClientProvider>
    </GluestackUIProvider>
  );
}
