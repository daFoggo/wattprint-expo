import { Input, InputField } from '@/components/ui/input';

type SearchFieldProps = {
  value: string;
  onChangeText: (text: string) => void;
  label: string;
  placeholder: string;
};

export function SearchField({ value, onChangeText, label, placeholder }: SearchFieldProps) {
  return (
    <Input>
      <InputField
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        aria-label={label}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
      />
    </Input>
  );
}
