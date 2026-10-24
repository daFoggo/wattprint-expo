import { FlashList } from '@shopify/flash-list';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { EmptyState } from '@/components/states/empty-state';
import { ErrorState } from '@/components/states/error-state';
import { LoadingState } from '@/components/states/loading-state';
import { Button, ButtonText } from '@/components/ui/button';
import { benchLog } from '@/features/lab/bench/bench-log';
import { RenderCount } from '@/features/lab/bench/render-count';
import { ProductRow } from '@/features/lab/components/product-row';
import { SearchField } from '@/features/lab/components/search-field';
import { useProductSearch } from '@/features/lab/hooks/use-product-search';

const BENCH_HREF = '/lab/bench?impl=flash&n=500' as Href;

export function ProductsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { text, setText, q, query } = useProductSearch();
  const { data, error, isError, isPlaceholderData, fetchStatus, refetch } = query;

  // Time from mount to the first real (not placeholder) content, for the benchmarks.
  const [mountedAt] = useState(() => Date.now());
  const reported = useRef(false);
  useEffect(() => {
    if (data !== undefined && !isPlaceholderData && !reported.current) {
      reported.current = true;
      benchLog({ event: 'products-content', ms: Date.now() - mountedAt, q });
    }
  }, [data, isPlaceholderData, q, mountedAt]);

  const paused = fetchStatus === 'paused';

  function renderBody() {
    if (data === undefined) {
      if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />;
      if (paused) {
        return (
          <EmptyState
            title={t('lab.products.pausedTitle')}
            description={t('lab.products.pausedDescription')}
          />
        );
      }
      return <LoadingState label={t('lab.products.loading')} />;
    }
    if (data.products.length === 0) {
      return (
        <EmptyState
          title={t('lab.products.emptyTitle')}
          description={t('lab.products.emptyDescription', { q })}
        />
      );
    }
    return (
      <RenderCount id="products-list">
        <FlashList
          data={data.products}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <ProductRow product={item} onPress={(id) => router.push(`/lab/${id}` as Href)} />
          )}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshing={query.isRefetching && !isPlaceholderData}
          onRefresh={() => void refetch()}
        />
      </RenderCount>
    );
  }

  // A failed or paused refresh keeps the cached rows; say so instead of replacing them.
  const banner =
    data !== undefined && isError
      ? t('lab.products.refreshFailed')
      : data !== undefined && paused
        ? t('lab.products.offlineBanner')
        : null;

  return (
    <View className="bg-background flex-1">
      <View className="gap-2 px-4 py-3">
        <SearchField
          value={text}
          onChangeText={setText}
          label={t('lab.products.searchLabel')}
          placeholder={t('lab.products.searchPlaceholder')}
        />
        <Button variant="outline" size="sm" onPress={() => router.push(BENCH_HREF)}>
          <ButtonText>{t('lab.products.openBench')}</ButtonText>
        </Button>
        {banner !== null && (
          <Text
            accessibilityLiveRegion="polite"
            className="text-muted-foreground text-center text-sm"
          >
            {banner}
          </Text>
        )}
      </View>
      <View className="flex-1">{renderBody()}</View>
    </View>
  );
}
