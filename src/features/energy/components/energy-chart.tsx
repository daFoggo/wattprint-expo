import { createContext, use, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Bar, CartesianChart } from 'victory-native';

import { EmptyState } from '@/components/states/empty-state';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { hasUsage } from '@/features/energy/energy-selectors';
import { useChartBarColor } from '@/features/energy/hooks/use-chart-bar-color';
import type { UsagePoint } from '@/features/energy/schemas';

type EnergyChartValue = { state: { points: UsagePoint[]; barColor: string | null } };

const EnergyChartContext = createContext<EnergyChartValue | null>(null);

function useEnergyChart(): EnergyChartValue {
  const value = use(EnergyChartContext);
  if (value === null) throw new Error('Energy chart parts must be used inside EnergyChart');
  return value;
}

export function toChartData(points: UsagePoint[]): { x: number; kwh: number }[] {
  return points.map((p, i) => ({ x: i, kwh: p.kwh }));
}

// Card root and provider. A canvas is invisible to TalkBack, so the root carries the summary label.
// The colour is read here, outside the Skia Canvas, and passed down as a plain value.
export function EnergyChart({
  points,
  accessibilityLabel,
  children,
}: {
  points: UsagePoint[];
  accessibilityLabel: string;
  children: ReactNode;
}) {
  const barColor = useChartBarColor();
  return (
    <EnergyChartContext value={{ state: { points, barColor } }}>
      <Card size="sm" accessible accessibilityLabel={accessibilityLabel}>
        {children}
      </Card>
    </EnergyChartContext>
  );
}

export function EnergyChartBars() {
  const { t } = useTranslation();
  const { points, barColor } = useEnergyChart().state;

  if (!hasUsage(points))
    return <EmptyState title={t('energy.noUsageTitle')} className="flex-none p-2" />;
  if (barColor === null) return null;

  return (
    <View className="h-48 w-full">
      <CartesianChart
        data={toChartData(points)}
        xKey="x"
        yKeys={['kwh']}
        domain={{ y: [0] }}
        domainPadding={{ left: 8, right: 8, top: 8 }}
      >
        {({ points: chartPoints, chartBounds }) => (
          <Bar
            points={chartPoints.kwh}
            chartBounds={chartBounds}
            color={barColor}
            roundedCorners={{ topLeft: 3, topRight: 3 }}
          />
        )}
      </CartesianChart>
    </View>
  );
}

// Plain RN text instead of Skia text: no font loading, and the labels follow the system font scale.
export function EnergyChartAxis({ labels }: { labels: string[] }) {
  const first = labels[0];
  const middle = labels[Math.floor(labels.length / 2)];
  const last = labels[labels.length - 1];
  return (
    <View className="flex-row justify-between gap-2">
      {[first, middle, last].map((label, i) => (
        <Text key={i} className="text-muted-foreground text-xs">
          {label}
        </Text>
      ))}
    </View>
  );
}
