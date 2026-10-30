import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function SettingsLayout() {
  const { t } = useTranslation();
  return (
    <Stack>
      <Stack.Screen name="settings" options={{ title: t('tabs.settings') }} />
    </Stack>
  );
}
