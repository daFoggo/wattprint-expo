import { FlashList } from '@shopify/flash-list';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { EmptyState } from '@/components/states/empty-state';
import { ErrorState } from '@/components/states/error-state';
import { LoadingState } from '@/components/states/loading-state';
import { OfflineState } from '@/components/states/offline-state';
import { Button, ButtonText } from '@/components/ui/button';
import { RenderCount, logRenderCounts } from '@/features/lab/bench/render-count';
import { ProductRow } from '@/features/lab/components/product-row';
import { SearchField } from '@/features/lab/components/search-field';
import { useProductSearch } from '@/features/lab/hooks/use-product-search';
import { prefetchQuotes } from '@/features/lab/queries';
import { staleBanner } from '@/features/lab/stale-banner';
import { benchLog } from '@/lib/bench-log';

const BENCH_HREF = '/lab/bench?impl=flash&n=500' as Href;

export function ProductsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { text, setText, q, shownQ, query } = useProductSearch();
  const { data, error, isError, isPlaceholderData, fetchStatus, refetch } = query;
  const [pulling, setPulling] = useState(false);

  // Time from mount to the first real (not placeholder) content, for the benchmarks. `fromCache`:
  // the content came from the cache without a fetch after this mount.
  const [mountedAt] = useState(() => Date.now());
  const reported = useRef(false);
  const fromCache = !query.isFetchedAfterMount;
  useEffect(() => {
    if (data !== undefined && !isPlaceholderData && !reported.current) {
      reported.current = true;
      benchLog({ event: 'products-content', ms: Date.now() - mountedAt, q, fromCache });
    }
  }, [data, isPlaceholderData, q, mountedAt, fromCache]);

  useEffect(() => logRenderCounts, []);

  const paused = fetchStatus === 'paused';

  function onPullToRefresh() {
    setPulling(true);
    void refetch().finally(() => setPulling(false));
  }

  function renderBody() {
    if (data === undefined) {
      if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />;
      if (paused) return <OfflineState />;
      return <LoadingState label={t('lab.products.loading')} />;
    }
    if (data.products.length === 0) {
      return (
        <EmptyState
          title={t('lab.products.emptyTitle')}
          description={
            shownQ === '' ? undefined : t('lab.products.emptyDescription', { q: shownQ })
          }
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
          refreshing={pulling}
          onRefresh={onPullToRefresh}
        />
      </RenderCount>
    );
  }

  const bannerKey = staleBanner(query);

  return (
    <View className="bg-background flex-1">
      <View className="gap-2 px-4 py-3">
        <SearchField
          value={text}
          onChangeText={setText}
          label={t('lab.products.searchLabel')}
          placeholder={t('lab.products.searchPlaceholder')}
        />
        <View className="flex-row gap-2">
          <Button
            className="flex-1"
            variant="outline"
            size="sm"
            onPress={() => void prefetchQuotes(queryClient, 500)}
          >
            <ButtonText>{t('lab.products.prefetchBench')}</ButtonText>
          </Button>
          <Button
            className="flex-1"
            variant="outline"
            size="sm"
            onPress={() => router.push(BENCH_HREF)}
          >
            <ButtonText>{t('lab.products.openBench')}</ButtonText>
          </Button>
        </View>
        {bannerKey !== null && (
          <Text
            accessibilityLiveRegion="polite"
            className="text-muted-foreground text-center text-sm"
          >
            {t(bannerKey)}
          </Text>
        )}
      </View>
      <View className="flex-1">{renderBody()}</View>
    </View>
  );
}
