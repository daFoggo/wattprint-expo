import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';

type Props = { title: string; subtitle?: string; action?: ReactNode };

// A large title at the top of the content, with the native header hidden (large titles are iOS only). It is the first
// child of the screen's scroll content, so it scrolls away with it. It clears the status bar itself.
export function ScreenHeader({ title, subtitle, action }: Props) {
  const { top } = useSafeAreaInsets();
  return (
    <View
      testID="screen-header"
      className="flex-row items-end justify-between gap-3"
      style={{ paddingTop: top }}
    >
      <View className="flex-1 gap-1">
        <Heading size="3xl" bold accessibilityRole="header">
          {title}
        </Heading>
        {subtitle ? (
          <Text testID="screen-header-subtitle" size="sm" className="text-muted-foreground">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action}
    </View>
  );
}
