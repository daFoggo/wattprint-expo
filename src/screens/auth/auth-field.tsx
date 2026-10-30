import { Text, View } from 'react-native';

import { Input, InputField } from '@/components/ui/input';

type Props = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  onBlur: () => void;
  // Already translated messages.
  errors: string[];
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  autoComplete?: 'email' | 'password' | 'new-password' | 'name';
};

export function AuthField({ label, errors, ...field }: Props) {
  return (
    <View className="gap-1">
      <Text className="text-foreground text-sm font-medium">{label}</Text>
      <Input isInvalid={errors.length > 0}>
        <InputField aria-label={label} autoCapitalize="none" autoCorrect={false} {...field} />
      </Input>
      {errors.length > 0 && (
        <Text selectable accessibilityLiveRegion="polite" className="text-destructive text-sm">
          {errors.join(', ')}
        </Text>
      )}
    </View>
  );
}
