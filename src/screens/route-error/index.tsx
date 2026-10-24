import type { ErrorBoundaryProps } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { Button, ButtonText } from '@/components/ui/button';

export function RouteError({ error, retry }: ErrorBoundaryProps) {
  const { t } = useTranslation();
  return (
    <View className="bg-background flex-1 items-center justify-center gap-4 px-6">
      <Text accessibilityRole="header" className="text-foreground text-2xl font-bold">
        {t('errors.title')}
      </Text>
      <Text selectable className="text-muted-foreground text-center text-sm">
        {error.message}
      </Text>
      <Button onPress={() => void retry()}>
        <ButtonText>{t('errors.retry')}</ButtonText>
      </Button>
    </View>
  );
}
