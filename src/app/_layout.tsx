import '../global.css';
import '@/i18n';

import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { useAppStateFocus } from '@/hooks/use-app-state-focus';
import { useNavTheme } from '@/hooks/use-nav-theme';
import { authClient } from '@/lib/auth-client';
import { initOnlineManager } from '@/lib/online-manager';
import { queryClient } from '@/lib/query-client';
import { RouteError } from '@/screens/route-error';
import { usePreferencesStore } from '@/stores/preferences-store';

import { QueryClientProvider } from '@tanstack/react-query';
import { SplashScreen, Stack, ThemeProvider, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Uniwind } from 'uniwind';

// Apply the stored theme before the first render so the first frame is not the wrong theme.
Uniwind.setTheme(usePreferencesStore.getState().theme);

// Make TanStack Query follow the device connectivity (pause offline, resume on reconnect).
initOnlineManager();

// Keep the splash up until the stored session is known, so the user never sees a sign-in flash.
void SplashScreen.preventAutoHideAsync();

export function ErrorBoundary(props: ErrorBoundaryProps) {
  return <RouteError {...props} />;
}

export default function RootLayout() {
  const theme = usePreferencesStore((s) => s.theme);
  const navTheme = useNavTheme();
  const { data: session, isPending } = authClient.useSession();
  useAppStateFocus();

  useEffect(() => {
    if (!isPending) void SplashScreen.hideAsync();
  }, [isPending]);

  return (
    <GluestackUIProvider mode={theme}>
      <StatusBar style="auto" />
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={navTheme}>
          {isPending ? null : (
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Protected guard={!!session}>
                <Stack.Screen name="(app)" />
              </Stack.Protected>
              <Stack.Protected guard={!session}>
                <Stack.Screen name="(auth)" />
              </Stack.Protected>
            </Stack>
          )}
        </ThemeProvider>
      </QueryClientProvider>
    </GluestackUIProvider>
  );
}
