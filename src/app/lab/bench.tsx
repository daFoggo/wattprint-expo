import { useLocalSearchParams } from 'expo-router';

import { ListBenchScreen } from '@/features/lab/screens/list-bench-screen';

export default function LabBench() {
  const { impl, n } = useLocalSearchParams<{ impl?: string; n?: string }>();
  return <ListBenchScreen impl={impl} n={n} />;
}
