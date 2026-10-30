import { useForm } from '@tanstack/react-form';
import { useRouter } from 'expo-router';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text } from 'react-native';

import { Button, ButtonText } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { authErrorKey } from '@/features/auth/auth-error';
import { useSignUp } from '@/features/auth/hooks/use-sign-up';
import { signUpSchema } from '@/features/auth/schemas';
import { errorMessage } from '@/lib/errors';

import { AuthField } from './auth-field';

export function SignUpScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const signUp = useSignUp();
  const submitting = useRef(false);

  const form = useForm({
    defaultValues: { name: '', email: '', password: '' },
    validators: { onSubmit: signUpSchema },
    onSubmit: async ({ value }) => {
      if (submitting.current) return;
      submitting.current = true;
      try {
        // Better Auth signs the new user in; the route guard then moves them into the app.
        await signUp.mutateAsync(value);
      } catch {
        // Shown through signUp.error.
      } finally {
        submitting.current = false;
      }
    },
  });

  const errorKey = authErrorKey(signUp.error);
  const apiError = signUp.error ? (errorKey ? t(errorKey) : errorMessage(signUp.error, t)) : null;

  return (
    <ScrollView
      className="bg-background flex-1"
      contentContainerClassName="gap-4 px-6 py-24"
      keyboardShouldPersistTaps="handled"
    >
      <Heading size="3xl" bold accessibilityRole="header">
        {t('auth.signUp.title')}
      </Heading>
      <Text className="text-muted-foreground text-sm">{t('auth.signUp.subtitle')}</Text>

      <form.Field name="name">
        {(field) => (
          <AuthField
            label={t('auth.name')}
            value={field.state.value}
            onChangeText={field.handleChange}
            onBlur={field.handleBlur}
            errors={field.state.meta.errors.map((e) => t(e?.message ?? ''))}
            autoComplete="name"
          />
        )}
      </form.Field>
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
            autoComplete="new-password"
          />
        )}
      </form.Field>

      {apiError !== null && (
        <Text selectable accessibilityLiveRegion="polite" className="text-destructive text-sm">
          {apiError}
        </Text>
      )}

      <Button disabled={signUp.isPending} onPress={() => void form.handleSubmit()}>
        <ButtonText>{t('auth.signUp.submit')}</ButtonText>
      </Button>
      <Button variant="outline" onPress={() => router.replace('/sign-in')}>
        <ButtonText>{t('auth.signUp.toSignIn')}</ButtonText>
      </Button>
    </ScrollView>
  );
}
