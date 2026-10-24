import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react-native';

import '@/i18n';
import * as api from '@/features/lab/api';
import { labKeys } from '@/features/lab/queries';
import { ProductDetailScreen } from '@/features/lab/screens/product-detail-screen';
import type { Product } from '@/features/lab/schemas';
import en from '@/i18n/locales/en.json';

jest.mock('@/features/lab/api');

const product: Product = {
  id: 3,
  title: 'Phone',
  description: 'A very good phone',
  category: 'smartphones',
  price: 12.5,
  rating: 4.2,
  thumbnail: 'https://cdn.dummyjson.com/p.webp',
};

// resetAllMocks would also wipe FlashList's jest layout mocks, so reset only the api mocks.
const resetApiMocks = () =>
  Object.values(api).forEach((fn) => typeof fn === 'function' && (fn as jest.Mock).mockReset());

let queryClient: QueryClient;

async function renderScreen(id: string) {
  return render(
    <QueryClientProvider client={queryClient}>
      <ProductDetailScreen id={id} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
afterEach(() => {
  onlineManager.setOnline(true);
  queryClient.clear();
  resetApiMocks();
});

describe('ProductDetailScreen', () => {
  it('loads and shows the product', async () => {
    (api.fetchProduct as jest.Mock).mockResolvedValue(product);
    await renderScreen('3');
    expect(await screen.findByText('A very good phone')).toBeTruthy();
    expect(screen.getByText('Price: $12.50')).toBeTruthy();
    expect(screen.getByLabelText('Photo of Phone')).toBeTruthy();
  });

  it('paints the cached list row at once while the detail request is pending', async () => {
    queryClient.setQueryData(labKeys.productList({ q: '', limit: 30 }), { products: [product] });
    (api.fetchProduct as jest.Mock).mockReturnValue(new Promise(() => undefined));
    await renderScreen('3');
    expect(screen.getByText('Phone')).toBeTruthy();
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('shows the error state for a failed request', async () => {
    (api.fetchProduct as jest.Mock).mockRejectedValue(new Error('gone'));
    await renderScreen('3');
    expect(await screen.findByText('gone')).toBeTruthy();
  });

  it('shows the paused state when offline with nothing cached', async () => {
    onlineManager.setOnline(false);
    await renderScreen('3');
    expect(await screen.findByText(en.lab.products.pausedTitle)).toBeTruthy();
    expect(api.fetchProduct).not.toHaveBeenCalled();
  });

  it('keeps the product and says so when a refresh fails', async () => {
    queryClient.setQueryData(labKeys.product(3), product);
    (api.fetchProduct as jest.Mock).mockRejectedValue(new Error('boom'));
    await renderScreen('3');
    expect(await screen.findByText(en.lab.products.refreshFailed)).toBeTruthy();
    expect(screen.getByText('A very good phone')).toBeTruthy();
    await act(async () => undefined);
  });

  it('does not request anything for an invalid id', async () => {
    await renderScreen('abc');
    expect(screen.getByText(en.lab.detail.invalidId)).toBeTruthy();
    expect(api.fetchProduct).not.toHaveBeenCalled();
  });
});
