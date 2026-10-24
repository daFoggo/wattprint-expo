import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';

export function LoadingState({ label }: { label?: string }) {
  const { t } = useTranslation();
  return (
    <View className="bg-background flex-1 items-center justify-center p-6">
      <ActivityIndicator
        size="large"
        colorClassName="accent-primary"
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={label ?? t('states.loading')}
      />
    </View>
  );
}
