import { useLocalSearchParams } from 'expo-router';

import { ProductDetailScreen } from '@/features/lab/screens/product-detail-screen';

export default function LabProduct() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ProductDetailScreen id={id} />;
}
