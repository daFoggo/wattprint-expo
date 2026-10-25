import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text } from 'react-native';
import { withUniwind } from 'uniwind';

import { ErrorState } from '@/components/states/error-state';
import { LoadingState } from '@/components/states/loading-state';
import { OfflineState } from '@/components/states/offline-state';
import { productQueryOptions } from '@/features/lab/queries';

const StyledImage = withUniwind(Image);

export function ProductDetailScreen({ id }: { id: string }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const productId = Number(id);
  const valid = Number.isInteger(productId) && productId > 0;
  const { data, error, isError, fetchStatus, refetch } = useQuery({
    ...productQueryOptions(productId, queryClient),
    enabled: valid,
  });

  if (!valid) return <ErrorState error={new Error(t('lab.detail.invalidId'))} />;
  if (data === undefined) {
    if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />;
    if (fetchStatus === 'paused') return <OfflineState />;
    return <LoadingState label={t('lab.detail.loading')} />;
  }

  return (
    <ScrollView className="bg-background flex-1" contentContainerClassName="gap-3 p-4">
      {isError && (
        <Text
          accessibilityLiveRegion="polite"
          className="text-muted-foreground text-center text-sm"
        >
          {t('lab.products.refreshFailed')}
        </Text>
      )}
      <StyledImage
        source={data.thumbnail}
        contentFit="contain"
        accessibilityLabel={t('lab.detail.imageLabel', { title: data.title })}
        className="bg-muted aspect-square w-full rounded-lg"
      />
      <Text accessibilityRole="header" className="text-foreground text-2xl font-bold">
        {data.title}
      </Text>
      <Text className="text-foreground text-lg font-semibold">
        {t('lab.detail.price', { price: data.price.toFixed(2) })}
      </Text>
      <Text className="text-muted-foreground text-sm">
        {t('lab.detail.category', { category: data.category })}
      </Text>
      <Text className="text-muted-foreground text-sm">
        {t('lab.detail.rating', { rating: data.rating })}
      </Text>
      <Text className="text-foreground text-base">{data.description}</Text>
    </ScrollView>
  );
}
