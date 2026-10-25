import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View, type ViewProps } from 'react-native';

import { stateContainerStyle } from './state-style';

type EmptyStateProps = Omit<ViewProps, 'children' | 'className'> & {
  title?: string;
  description?: string;
  className?: string;
  // Action slot, e.g. a `Button`. The state does not know what the action is.
  children?: ReactNode;
};

export function EmptyState({ title, description, className, children, ...props }: EmptyStateProps) {
  const { t } = useTranslation();
  return (
    <View {...props} className={stateContainerStyle({ class: className })}>
      <Text
        accessibilityRole="header"
        className="text-foreground text-center text-lg font-semibold"
      >
        {title ?? t('states.emptyTitle')}
      </Text>
      {description !== undefined && (
        <Text className="text-muted-foreground text-center text-sm">{description}</Text>
      )}
      {children}
    </View>
  );
}
