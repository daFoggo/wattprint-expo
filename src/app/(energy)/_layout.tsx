import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function EnergyLayout() {
  const { t } = useTranslation();
  return (
    <Stack>
      <Stack.Screen name="energy" options={{ title: t('tabs.energy') }} />
    </Stack>
  );
}
