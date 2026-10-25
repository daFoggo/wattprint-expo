import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { Button, ButtonText } from '@/components/ui/button';
import { errorMessage } from '@/lib/errors';

type ErrorStateProps = {
  error: unknown;
  title?: string;
  onRetry?: () => void;
};

export function ErrorState({ error, title, onRetry }: ErrorStateProps) {
  const { t } = useTranslation();
  const message = errorMessage(error, t);
  return (
    <View className="bg-background flex-1 items-center justify-center gap-3 p-6">
      <Text
        accessibilityRole="header"
        className="text-foreground text-center text-lg font-semibold"
      >
        {title ?? t('errors.title')}
      </Text>
      <Text
        selectable
        accessibilityLiveRegion="polite"
        className="text-muted-foreground text-center text-sm"
      >
        {message}
      </Text>
      {onRetry !== undefined && (
        <Button onPress={onRetry}>
          <ButtonText>{t('errors.retry')}</ButtonText>
        </Button>
      )}
    </View>
  );
}
