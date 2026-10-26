import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Progress, ProgressFilledTrack } from '@/components/ui/progress';
import { Text } from '@/components/ui/text';
import { shareOf } from '@/features/energy/energy-selectors';
import type { DeviceUsage } from '@/features/energy/schemas';
import { formatNumber } from '@/lib/format';

export function TopDevicesList({ devices, total }: { devices: DeviceUsage[]; total: number }) {
  const { t, i18n } = useTranslation();
  return (
    <Card size="sm">
      <Heading size="md" accessibilityRole="header">
        {t('energy.topDevices')}
      </Heading>
      {devices.map((device) => {
        const share = shareOf(device.kwh, total);
        return (
          <View key={device.deviceId} className="gap-1">
            <View className="flex-row items-start justify-between gap-3">
              <Text className="flex-1">{device.name}</Text>
              <Text size="sm" className="text-muted-foreground">
                {t('energy.kwh', {
                  value: formatNumber(device.kwh, i18n.language, { maximumFractionDigits: 1 }),
                })}
              </Text>
            </View>
            <Progress
              value={share}
              accessibilityLabel={t('energy.topShare', {
                name: device.name,
                share: formatNumber(share, i18n.language, { maximumFractionDigits: 0 }),
              })}
            >
              <ProgressFilledTrack />
            </Progress>
          </View>
        );
      })}
    </Card>
  );
}
