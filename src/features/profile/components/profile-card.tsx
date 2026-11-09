import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { Button, ButtonText } from '@/components/ui/button';
import { ErrorState } from '@/components/states/error-state';
import { LoadingState } from '@/components/states/loading-state';

import { useMe } from '@/features/profile/hooks/use-me';

// Profile read from FastAPI with the Keycloak access token (GET /users/me).
export function ProfileCard() {
  const { t } = useTranslation();
  const me = useMe();

  if (me.isPending) return <LoadingState />;
  if (me.isError) return <ErrorState error={me.error} onRetry={() => void me.refetch()} />;

  return (
    <View className="bg-card w-full gap-1 rounded-2xl p-4">
      <Text className="text-foreground text-lg font-semibold">
        {me.data.full_name ?? me.data.email}
      </Text>
      <Text selectable className="text-muted-foreground text-sm">
        {me.data.email}
      </Text>
      <Text selectable className="text-muted-foreground text-sm">
        {t('profile.roles', { roles: me.data.roles.join(', ') })}
      </Text>
      <Button variant="outline" disabled={me.isFetching} onPress={() => void me.refetch()}>
        <ButtonText>{t('profile.reload')}</ButtonText>
      </Button>
    </View>
  );
}
