import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';

import {
  EnergyChart,
  EnergyChartAxis,
  EnergyChartBars,
} from '@/features/energy/components/energy-chart';
import { EnergyRangeSwitch } from '@/features/energy/components/energy-range-switch';
import { TopDevicesList } from '@/features/energy/components/top-devices-list';
import { UsageSummaryCard } from '@/features/energy/components/usage-summary-card';
import { totalKwh, topN } from '@/features/energy/energy-selectors';
import { useEnergySummary } from '@/features/energy/hooks/use-energy-summary';
import type { EnergyRange } from '@/features/energy/schemas';

// Mock timestamps are UTC, so labels are formatted in UTC to stay the same on every device.
function axisLabel(at: string, range: EnergyRange, locale: string): string {
  const options: Intl.DateTimeFormatOptions =
    range === 'day'
      ? { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' }
      : { day: 'numeric', month: 'numeric', timeZone: 'UTC' };
  return new Intl.DateTimeFormat(locale, options).format(new Date(at));
}

export function EnergyScreen() {
  const { t, i18n } = useTranslation();
  const [range, setRange] = useState<EnergyRange>('day');
  const summary = useEnergySummary(range);

  return (
    <ScrollView className="bg-background flex-1" contentContainerClassName="gap-4 p-4">
      <EnergyRangeSwitch value={range} onChange={setRange} />
      <EnergyChart
        points={summary.points}
        accessibilityLabel={`${t('energy.chartLabel')}, ${t(`energy.ranges.${range}`)}`}
      >
        <EnergyChartBars />
        <EnergyChartAxis
          labels={summary.points.map((p) => axisLabel(p.at, range, i18n.language))}
        />
      </EnergyChart>
      <UsageSummaryCard summary={summary} />
      <TopDevicesList devices={topN(summary.topDevices, 3)} total={totalKwh(summary.points)} />
    </ScrollView>
  );
}
