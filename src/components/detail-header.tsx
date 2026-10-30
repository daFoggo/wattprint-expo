import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RoundIconButton } from '@/components/round-icon-button';
import { Heading } from '@/components/ui/heading';
import { ChevronLeftIcon, Icon } from '@/components/ui/icon';

type Props = { onBack: () => void; backLabel: string; title?: string; trailing?: ReactNode };

// A bar-less header for a detail screen: a round back button, an optional centred title and an optional trailing
// round button (the native header is hidden). `trailing` should be a 48 dp control so the title stays centred.
export function DetailHeader({ onBack, backLabel, title, trailing }: Props) {
  const { top } = useSafeAreaInsets();
  return (
    <View className="flex-row items-center justify-between gap-3" style={{ paddingTop: top }}>
      <RoundIconButton accessibilityLabel={backLabel} onPress={onBack}>
        <Icon as={ChevronLeftIcon} size="xl" />
      </RoundIconButton>
      {title ? (
        <Heading size="md" bold accessibilityRole="header" className="flex-1 text-center">
          {title}
        </Heading>
      ) : (
        <View className="flex-1" />
      )}
      {trailing ?? <View className="h-12 w-12" />}
    </View>
  );
}
