import { useTranslation } from 'react-i18next';

import { EmptyState } from './empty-state';

type OfflineStateProps = Omit<React.ComponentProps<typeof EmptyState>, 'title' | 'children'>;

// Explicit variant of EmptyState for a query that is paused because the device is offline.
export function OfflineState({ description, ...props }: OfflineStateProps) {
  const { t } = useTranslation();
  return (
    <EmptyState
      {...props}
      title={t('states.pausedTitle')}
      description={description ?? t('states.pausedDescription')}
    />
  );
}
