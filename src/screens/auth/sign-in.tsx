import { useForm } from '@tanstack/react-form';
import { useRouter } from 'expo-router';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text } from 'react-native';

import { Button, ButtonText } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { authErrorKey } from '@/features/auth/auth-error';
import { useSignIn } from '@/features/auth/hooks/use-sign-in';
import { signInSchema } from '@/features/auth/schemas';
import { errorMessage } from '@/lib/errors';

import { AuthField } from './auth-field';

export function SignInScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const signIn = useSignIn();
  const submitting = useRef(false);

  const form = useForm({
    defaultValues: { email: '', password: '' },
    validators: { onSubmit: signInSchema },
    onSubmit: async ({ value }) => {
      if (submitting.current) return;
      submitting.current = true;
      try {
        // The session store flips on success and the route guard moves the user; errors render below.
        await signIn.mutateAsync(value);
      } catch {
        // Shown through signIn.error.
      } finally {
        submitting.current = false;
      }
    },
  });

  const errorKey = authErrorKey(signIn.error);
  const apiError = signIn.error ? (errorKey ? t(errorKey) : errorMessage(signIn.error, t)) : null;

  return (
    <ScrollView
      className="bg-background flex-1"
      contentContainerClassName="gap-4 px-6 py-24"
      keyboardShouldPersistTaps="handled"
    >
      <Heading size="3xl" bold accessibilityRole="header">
        {t('auth.signIn.title')}
      </Heading>
      <Text className="text-muted-foreground text-sm">{t('auth.signIn.subtitle')}</Text>

      <form.Field name="email">
        {(field) => (
          <AuthField
            label={t('auth.email')}
            value={field.state.value}
            onChangeText={field.handleChange}
            onBlur={field.handleBlur}
            errors={field.state.meta.errors.map((e) => t(e?.message ?? ''))}
            keyboardType="email-address"
            autoComplete="email"
          />
        )}
      </form.Field>
      <form.Field name="password">
        {(field) => (
          <AuthField
            label={t('auth.password')}
            value={field.state.value}
            onChangeText={field.handleChange}
            onBlur={field.handleBlur}
            errors={field.state.meta.errors.map((e) => t(e?.message ?? ''))}
            secureTextEntry
            autoComplete="password"
          />
        )}
      </form.Field>

      {apiError !== null && (
        <Text selectable accessibilityLiveRegion="polite" className="text-destructive text-sm">
          {apiError}
        </Text>
      )}

      <Button disabled={signIn.isPending} onPress={() => void form.handleSubmit()}>
        <ButtonText>{t('auth.signIn.submit')}</ButtonText>
      </Button>
      <Button variant="outline" onPress={() => router.push('/sign-up')}>
        <ButtonText>{t('auth.signIn.toSignUp')}</ButtonText>
      </Button>
    </ScrollView>
  );
}
