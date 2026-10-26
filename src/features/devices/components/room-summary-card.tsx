import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { countOn } from '@/features/devices/device-selectors';
import type { Device, Room } from '@/features/devices/schemas';

export function RoomSummaryCard({ room, devices }: { room: Room; devices: Device[] }) {
  const { t } = useTranslation();
  return (
    <Card size="sm">
      <Heading size="sm" accessibilityRole="header">
        {room.name}
      </Heading>
      <Text size="sm" className="text-muted-foreground">
        {t('devices.onCount', { on: countOn(devices), total: devices.length })}
      </Text>
    </Card>
  );
}
