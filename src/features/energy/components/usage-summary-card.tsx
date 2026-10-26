import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { costOf, totalKwh } from '@/features/energy/energy-selectors';
import type { EnergySummary } from '@/features/energy/schemas';
import { formatCurrency, formatNumber } from '@/lib/format';

export function UsageSummaryCard({ summary }: { summary: EnergySummary }) {
  const { t, i18n } = useTranslation();
  const total = totalKwh(summary.points);
  return (
    <Card size="sm">
      <View className="gap-1">
        <Text size="sm" className="text-muted-foreground">
          {t('energy.total')}
        </Text>
        <Text size="2xl" bold>
          {t('energy.kwh', {
            value: formatNumber(total, i18n.language, { maximumFractionDigits: 1 }),
          })}
        </Text>
      </View>
      <View className="gap-1">
        <Text size="sm" className="text-muted-foreground">
          {t('energy.cost')}
        </Text>
        <Text size="lg" bold>
          {formatCurrency(costOf(total, summary.pricePerKwh), i18n.language, summary.currency)}
        </Text>
      </View>
    </Card>
  );
}
