import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { CollapsingScrollView } from '@/components/collapsing-scroll-view';
import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { RoomSummaryCard } from '@/features/devices/components/room-summary-card';
import { currentWatts, groupByRoom } from '@/features/devices/device-selectors';
import { useDeviceStates } from '@/features/devices/device-states';
import { costOf, totalKwh } from '@/features/energy/energy-selectors';
import { useEnergySummary } from '@/features/energy/hooks/use-energy-summary';
import { formatCurrency, formatNumber } from '@/lib/format';

import { greetingKey } from './greeting';

const SCENES = ['home', 'away', 'night'] as const;
type Scene = (typeof SCENES)[number];

export function Home() {
  const { t, i18n } = useTranslation();
  const { state } = useDeviceStates();
  const today = useEnergySummary('day');
  const [scene, setScene] = useState<Scene>('home');
  const todayKwh = totalKwh(today.points);

  return (
    <CollapsingScrollView
      title={t(greetingKey(new Date().getHours()))}
      contentContainerClassName="gap-4 p-4"
    >
      <Card size="sm">
        <Text size="sm" className="text-muted-foreground">
          {t('home.currentDraw')}
        </Text>
        <Text size="2xl" bold>
          {t('devices.watts', { value: formatNumber(currentWatts(state.devices), i18n.language) })}
        </Text>
      </Card>

      <Card size="sm">
        <Text size="sm" className="text-muted-foreground">
          {t('home.today')}
        </Text>
        <Text size="xl" bold>
          {t('energy.kwh', {
            value: formatNumber(todayKwh, i18n.language, { maximumFractionDigits: 1 }),
          })}
        </Text>
        <Text size="sm" className="text-muted-foreground">
          {t('home.cost')}
        </Text>
        <Text size="lg" bold>
          {formatCurrency(costOf(todayKwh, today.pricePerKwh), i18n.language, today.currency)}
        </Text>
      </Card>

      <Heading size="md" accessibilityRole="header">
        {t('home.scenesTitle')}
      </Heading>
      <View className="flex-row flex-wrap gap-2">
        {SCENES.map((item) => (
          <Button
            key={item}
            variant={item === scene ? 'default' : 'outline'}
            accessibilityState={{ selected: item === scene }}
            onPress={() => setScene(item)}
          >
            <ButtonText>{t(`home.scenes.${item}`)}</ButtonText>
          </Button>
        ))}
      </View>

      <Heading size="md" accessibilityRole="header">
        {t('home.rooms')}
      </Heading>
      {groupByRoom(state.rooms, state.devices)
        .slice(0, 3)
        .map(({ room, devices }) => (
          <RoomSummaryCard key={room.id} room={room} devices={devices} />
        ))}
    </CollapsingScrollView>
  );
}
