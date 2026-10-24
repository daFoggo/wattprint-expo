import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { Button, ButtonText } from '@/components/ui/button';

type EmptyStateProps = {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  const { t } = useTranslation();
  return (
    <View className="bg-background flex-1 items-center justify-center gap-3 p-6">
      <Text
        accessibilityRole="header"
        className="text-foreground text-center text-lg font-semibold"
      >
        {title ?? t('states.emptyTitle')}
      </Text>
      {description !== undefined && (
        <Text className="text-muted-foreground text-center text-sm">{description}</Text>
      )}
      {actionLabel !== undefined && onAction !== undefined && (
        <Button onPress={onAction}>
          <ButtonText>{actionLabel}</ButtonText>
        </Button>
      )}
    </View>
  );
}
