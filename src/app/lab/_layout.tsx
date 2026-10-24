import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function LabLayout() {
  const { t } = useTranslation();
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: t('lab.products.title') }} />
      <Stack.Screen name="[id]" options={{ title: t('lab.detail.title') }} />
      <Stack.Screen name="bench" options={{ title: t('lab.bench.title') }} />
    </Stack>
  );
}
