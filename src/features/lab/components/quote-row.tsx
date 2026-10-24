import { Text, View, type LayoutChangeEvent } from 'react-native';

import type { Quote } from '@/features/lab/schemas';

type QuoteRowProps = {
  quote: Quote;
  onLayout?: (event: LayoutChangeEvent) => void;
};

export function QuoteRow({ quote, onLayout }: QuoteRowProps) {
  return (
    <View onLayout={onLayout} className="border-border bg-card gap-1 border-b px-4 py-3">
      <Text className="text-foreground text-base">{quote.quote}</Text>
      <Text className="text-muted-foreground text-sm">{quote.author}</Text>
    </View>
  );
}
