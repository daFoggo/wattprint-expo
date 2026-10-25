import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View, type ViewProps } from 'react-native';

import { stateContainerStyle } from './state-style';

type LoadingStateProps = Omit<ViewProps, 'children' | 'className'> & {
  label?: string;
  className?: string;
};

export function LoadingState({ label, className, ...props }: LoadingStateProps) {
  const { t } = useTranslation();
  return (
    <View {...props} className={stateContainerStyle({ class: className })}>
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
