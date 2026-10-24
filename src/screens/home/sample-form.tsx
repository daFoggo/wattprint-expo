import { useForm, useStore } from '@tanstack/react-form';
import { useDebouncedValue } from '@tanstack/react-pacer';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { z } from 'zod';

import { Button, ButtonText } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';

export function SampleForm({ onSubmit }: { onSubmit: (v: { email: string }) => void }) {
  const { t } = useTranslation();
  const form = useForm({
    defaultValues: { email: '' },
    validators: { onChange: z.object({ email: z.email(t('form.emailInvalid')) }) },
    onSubmit: ({ value }) => onSubmit(value),
  });
  const emailValue = useStore(form.store, (state) => state.values.email);
  const [debounced] = useDebouncedValue(emailValue, { wait: 300 });

  return (
    <View className="w-full gap-2">
      <form.Field name="email">
        {(field) => (
          <View className="gap-1">
            <Input isInvalid={!field.state.meta.isValid}>
              <InputField
                accessibilityLabel={t('form.email')}
                placeholder="you@example.com"
                autoCapitalize="none"
                keyboardType="email-address"
                value={field.state.value}
                onChangeText={field.handleChange}
                onBlur={field.handleBlur}
              />
            </Input>
            {!field.state.meta.isValid && (
              <Text
                testID="email-error"
                accessibilityLiveRegion="polite"
                className="text-destructive text-sm"
              >
                {field.state.meta.errors.map((e) => e?.message).join(', ')}
              </Text>
            )}
          </View>
        )}
      </form.Field>
      <Text testID="email-echo" className="text-muted-foreground text-sm">
        {debounced}
      </Text>
      <Button onPress={() => form.handleSubmit()}>
        <ButtonText>{t('form.submit')}</ButtonText>
      </Button>
    </View>
  );
}
