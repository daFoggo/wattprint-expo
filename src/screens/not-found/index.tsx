import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { Button, ButtonText } from '@/components/ui/button';

export function NotFound() {
  const { t } = useTranslation();
  return (
    <View className="bg-background flex-1 items-center justify-center gap-4 px-6">
      <Text accessibilityRole="header" className="text-foreground text-2xl font-bold">
        {t('notFound.title')}
      </Text>
      <Text className="text-muted-foreground text-center text-sm">{t('notFound.message')}</Text>
      <Button onPress={() => router.replace('/')}>
        <ButtonText>{t('notFound.goHome')}</ButtonText>
      </Button>
    </View>
  );
}
