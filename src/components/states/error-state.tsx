import { useTranslation } from 'react-i18next';
import { Text, View, type ViewProps } from 'react-native';

import { Button, ButtonText } from '@/components/ui/button';
import { errorMessage } from '@/lib/errors';

import { stateContainerStyle } from './state-style';

type ErrorStateProps = Omit<ViewProps, 'children' | 'className'> & {
  error: unknown;
  title?: string;
  onRetry?: () => void;
  className?: string;
};

export function ErrorState({ error, title, onRetry, className, ...props }: ErrorStateProps) {
  const { t } = useTranslation();
  const message = errorMessage(error, t);
  return (
    <View {...props} className={stateContainerStyle({ class: className })}>
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
