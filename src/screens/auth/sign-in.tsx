import { useTranslation } from 'react-i18next';
import { ScrollView, Text } from 'react-native';

import { Button, ButtonText } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { authErrorKey } from '@/features/auth/auth-error';
import { useSignIn } from '@/features/auth/hooks/use-sign-in';
import { errorMessage } from '@/lib/errors';

export function SignInScreen() {
  const { t } = useTranslation();
  const signIn = useSignIn();

  const errorKey = authErrorKey(signIn.error);
  const apiError = signIn.error ? (errorKey ? t(errorKey) : errorMessage(signIn.error, t)) : null;

  return (
    <ScrollView className="bg-background flex-1" contentContainerClassName="gap-4 px-6 py-24">
      <Heading size="3xl" bold accessibilityRole="header">
        {t('auth.signIn.title')}
      </Heading>
      <Text className="text-muted-foreground text-sm">{t('auth.signIn.subtitle')}</Text>

      {apiError !== null && (
        <Text selectable accessibilityLiveRegion="polite" className="text-destructive text-sm">
          {apiError}
        </Text>
      )}

      {/* The session store flips on success and the route guard moves the user. */}
      <Button disabled={signIn.isPending} onPress={() => signIn.mutate()}>
        <ButtonText>{t('auth.signIn.submit')}</ButtonText>
      </Button>
    </ScrollView>
  );
}
