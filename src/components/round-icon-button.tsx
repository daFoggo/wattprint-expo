import type { ComponentProps } from 'react';

import { Pressable } from '@/components/ui/pressable';

type Props = Omit<ComponentProps<typeof Pressable>, 'accessibilityRole' | 'className'> & {
  accessibilityLabel: string;
};

// A flat 48 dp circle on the card surface (no border, no shadow), like the back and settings buttons in Sense.
export function RoundIconButton({ children, ...props }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      className="bg-card h-12 w-12 items-center justify-center rounded-full data-[active=true]:bg-muted"
      {...props}
    >
      {children}
    </Pressable>
  );
}
