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
import { hasUsage, peakKwh, topN, totalKwh } from '@/features/energy/energy-selectors';
import { useEnergySummary } from '@/features/energy/hooks/use-energy-summary';
import type { EnergyRange } from '@/features/energy/schemas';
import { formatNumber } from '@/lib/format';

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
  const total = totalKwh(summary.points);
  const kwh = (value: number) => formatNumber(value, i18n.language, { maximumFractionDigits: 1 });
  const rangeName = t(`energy.ranges.${range}`);
  const chartLabel = hasUsage(summary.points)
    ? t('energy.chartSummary', {
        range: rangeName,
        total: kwh(total),
        peak: t('energy.kwh', { value: kwh(peakKwh(summary.points)) }),
      })
    : t('energy.chartSummaryEmpty', { range: rangeName });

  return (
    <ScrollView className="bg-background flex-1" contentContainerClassName="gap-4 p-4">
      <EnergyRangeSwitch value={range} onChange={setRange} />
      <EnergyChart points={summary.points} accessibilityLabel={chartLabel}>
        <EnergyChartBars />
        <EnergyChartAxis
          labels={summary.points.map((p) => axisLabel(p.at, range, i18n.language))}
        />
      </EnergyChart>
      <UsageSummaryCard summary={summary} />
      <TopDevicesList devices={topN(summary.topDevices, 3)} total={total} />
    </ScrollView>
  );
}
