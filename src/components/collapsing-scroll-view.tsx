import type { ComponentProps, ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { withUniwind } from 'uniwind';

import { ScreenHeader } from '@/components/screen-header';
import { Heading } from '@/components/ui/heading';

const AnimatedView = withUniwind(Animated.createAnimatedComponent(View));

const BAR_HEIGHT = 56;
// Scroll distance over which the compact bar fades in, roughly while the large title slides under it.
const FADE_START = 16;
const FADE_END = 48;

type Props = ComponentProps<typeof ScrollView> & {
  title: string;
  subtitle?: string;
  action?: ReactNode;
};

// A tab screen like Sense: a large title at the top of the scroll content that, once scrolled away, hands over to a
// compact bar with the centred title. The bar is a flat `bg-background` strip (no blur, border or shadow). The scroll
// offset is written from the JS scroll event (one value per frame at most), which is enough for a fade.
export function CollapsingScrollView({
  title,
  subtitle,
  action,
  children,
  onScroll,
  className,
  ...props
}: Props) {
  const { top } = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const barStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [FADE_START, FADE_END], [0, 1], Extrapolation.CLAMP),
  }));

  return (
    <View className="bg-background flex-1">
      <ScrollView
        scrollEventThrottle={16}
        {...props}
        className={className}
        onScroll={(event) => {
          scrollY.set(event.nativeEvent.contentOffset.y);
          onScroll?.(event);
        }}
      >
        <ScreenHeader title={title} subtitle={subtitle} action={action} />
        {children}
      </ScrollView>
      <AnimatedView
        testID="collapsed-bar"
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        className="bg-background absolute inset-x-0 top-0 justify-end"
        style={[{ height: top + BAR_HEIGHT }, barStyle]}
      >
        <View className="h-14 items-center justify-center px-16">
          <Heading size="md" bold numberOfLines={1}>
            {title}
          </Heading>
        </View>
      </AnimatedView>
    </View>
  );
}
