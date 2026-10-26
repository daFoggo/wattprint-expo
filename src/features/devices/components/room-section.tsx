import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import type { Room } from '@/features/devices/schemas';

export function RoomSection({ room, children }: { room: Room; children: ReactNode }) {
  return (
    <Card size="sm">
      <Heading size="md" accessibilityRole="header">
        {room.name}
      </Heading>
      <View>{children}</View>
    </Card>
  );
}
