import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Text, View } from 'react-native';

import { ErrorState } from '@/components/states/error-state';
import { LoadingState } from '@/components/states/loading-state';
import { benchLog } from '@/lib/bench-log';
import { RenderCount, logRenderCounts } from '@/features/lab/bench/render-count';
import { QuoteRow } from '@/features/lab/components/quote-row';
import { quotesQueryOptions } from '@/features/lab/queries';
import type { Quote } from '@/features/lab/schemas';

// Benchmark runs must control the cache state, or the numbers mix a network fetch with list cost:
// cold = app freshly started and nothing prefetched; warm = quotes prefetched (products screen
// "Prefetch" button, or prefetchQuotes) before opening this screen. Each log line says which one
// it was (the cached field). "first native layout" is the first row's onLayout callback, which fires after
// the native layout pass, not after the pixels are on screen.
export const BENCH_IMPLS = ['flash', 'flat'] as const;
export const BENCH_SIZES = [100, 500, 1000] as const;
export type BenchImpl = (typeof BENCH_IMPLS)[number];
export type BenchSize = (typeof BENCH_SIZES)[number];

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

// Route params arrive as strings; unknown values fall back to flash / 500.
export function parseBenchParams(
  impl: string | string[] | undefined,
  n: string | string[] | undefined,
): { impl: BenchImpl; n: BenchSize } {
  const implValue = BENCH_IMPLS.find((i) => i === first(impl)) ?? 'flash';
  const nValue = BENCH_SIZES.find((s) => String(s) === first(n)) ?? 500;
  return { impl: implValue, n: nValue };
}

type ListBenchScreenProps = {
  impl?: string | string[];
  n?: string | string[];
};

const keyExtractor = (item: Quote) => String(item.id);

export function ListBenchScreen(props: ListBenchScreenProps) {
  const { t } = useTranslation();
  const { impl, n } = parseBenchParams(props.impl, props.n);
  const { data, dataUpdatedAt, error, isError, refetch } = useQuery(quotesQueryOptions(n));

  const [mountedAt] = useState(() => Date.now());
  const dataLogged = useRef(false);
  const firstRowLogged = useRef(false);

  // Data cached before this mount has dataUpdatedAt < mountedAt: no fetch was waited for.
  const cached = dataUpdatedAt < mountedAt;
  useEffect(() => {
    if (data !== undefined && !dataLogged.current) {
      dataLogged.current = true;
      benchLog({
        event: 'bench-data',
        impl,
        n,
        cached,
        msSinceMount: cached ? 0 : dataUpdatedAt - mountedAt,
      });
    }
  }, [data, dataUpdatedAt, cached, impl, n, mountedAt]);

  useEffect(() => logRenderCounts, []);

  const onFirstRowLayout = useCallback(() => {
    if (firstRowLogged.current) return;
    firstRowLogged.current = true;
    const now = Date.now();
    benchLog({
      event: 'bench-first-native-layout',
      impl,
      n,
      cached,
      msSinceMount: now - mountedAt,
      msSinceData: now - Math.max(dataUpdatedAt, mountedAt),
    });
  }, [impl, n, mountedAt, dataUpdatedAt, cached]);

  if (data === undefined) {
    if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />;
    return <LoadingState label={t('lab.bench.loading')} />;
  }

  const renderItem = ({ item, index }: { item: Quote; index: number }) => (
    <QuoteRow quote={item} onLayout={index === 0 ? onFirstRowLayout : undefined} />
  );

  return (
    <View className="bg-background flex-1">
      <Text
        accessibilityRole="header"
        className="text-foreground px-4 py-3 text-base font-semibold"
      >
        {t('lab.bench.summary', { impl: t(`lab.bench.impl.${impl}`), n: data.quotes.length })}
      </Text>
      <RenderCount id={`bench-${impl}`}>
        {impl === 'flash' ? (
          <FlashList
            testID="bench-list"
            accessibilityLabel={t('lab.bench.listLabel')}
            data={data.quotes}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
          />
        ) : (
          <FlatList
            testID="bench-list"
            accessibilityLabel={t('lab.bench.listLabel')}
            data={data.quotes}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
          />
        )}
      </RenderCount>
    </View>
  );
}
