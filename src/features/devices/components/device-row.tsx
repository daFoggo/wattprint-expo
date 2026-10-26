import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Badge, BadgeText } from '@/components/ui/badge';
import { Pressable } from '@/components/ui/pressable';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { liveWatts } from '@/features/devices/device-selectors';
import type { Device } from '@/features/devices/schemas';
import { formatNumber } from '@/lib/format';

// The row is the single touch target and the single TalkBack node; the native Switch is only a
// visual indicator (pointerEvents none, hidden from accessibility).
export function DeviceRow({
  device,
  onToggle,
}: {
  device: Device;
  onToggle: (id: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const offline = device.status === 'offline';
  const watts = formatNumber(liveWatts(device), i18n.language);

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: device.on, disabled: offline }}
      accessibilityLabel={t('devices.rowLabel', {
        name: device.name,
        type: t(`devices.types.${device.type}`),
        status: t(`devices.status.${device.status}`),
        watts: t('devices.watts', { value: watts }),
      })}
      disabled={offline}
      onPress={() => onToggle(device.id)}
      className="min-h-12 flex-row items-center gap-3 py-2"
    >
      <View className="flex-1 gap-1">
        <Text className="flex-1 font-medium">{device.name}</Text>
        <View className="flex-row flex-wrap items-center gap-2">
          <Text size="sm" className="text-muted-foreground">
            {t(`devices.types.${device.type}`)}
          </Text>
          <Badge variant={offline ? 'outline' : 'secondary'}>
            <BadgeText>{t(`devices.status.${device.status}`)}</BadgeText>
          </Badge>
          <Text size="sm" className="text-muted-foreground">
            {t('devices.watts', { value: watts })}
          </Text>
        </View>
      </View>
      <View
        testID="device-switch-wrap"
        pointerEvents="none"
        importantForAccessibility="no-hide-descendants"
      >
        {/* Dimming comes from the disabled Pressable only; a disabled Switch would dim twice. */}
        <Switch value={device.on} />
      </View>
    </Pressable>
  );
}
