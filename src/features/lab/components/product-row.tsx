import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { withUniwind } from 'uniwind';

import type { Product } from '@/features/lab/schemas';

const StyledImage = withUniwind(Image);

type ProductRowProps = {
  product: Product;
  onPress: (id: number) => void;
};

export function ProductRow({ product, onPress }: ProductRowProps) {
  const { t } = useTranslation();
  const price = product.price.toFixed(2);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('lab.products.rowLabel', {
        title: product.title,
        category: product.category,
        price,
      })}
      onPress={() => onPress(product.id)}
      className="border-border bg-card active:bg-muted flex-row items-center gap-3 border-b px-4 py-3"
    >
      <StyledImage
        source={product.thumbnail}
        contentFit="cover"
        recyclingKey={String(product.id)}
        cachePolicy="memory-disk"
        accessible={false}
        className="bg-muted size-16 rounded-md"
      />
      <View className="flex-1 gap-1">
        <Text numberOfLines={1} className="text-foreground text-base font-semibold">
          {product.title}
        </Text>
        <Text numberOfLines={1} className="text-muted-foreground text-sm">
          {product.category}
        </Text>
      </View>
      <Text className="text-foreground text-base font-medium">${price}</Text>
    </Pressable>
  );
}
