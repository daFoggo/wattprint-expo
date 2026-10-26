import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button, ButtonText } from '@/components/ui/button';
import { energyRangeSchema, type EnergyRange } from '@/features/energy/schemas';

export function EnergyRangeSwitch({
  value,
  onChange,
}: {
  value: EnergyRange;
  onChange: (range: EnergyRange) => void;
}) {
  const { t } = useTranslation();
  return (
    <View className="flex-row flex-wrap gap-2">
      {energyRangeSchema.options.map((range) => (
        <Button
          key={range}
          variant={range === value ? 'default' : 'outline'}
          accessibilityState={{ selected: range === value }}
          onPress={() => onChange(range)}
        >
          <ButtonText>{t(`energy.ranges.${range}`)}</ButtonText>
        </Button>
      ))}
    </View>
  );
}
