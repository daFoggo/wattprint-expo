import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import '@/i18n';
import * as api from '@/features/lab/api';
import { ProductsScreen } from '@/features/lab/screens/products-screen';
import type { Product } from '@/features/lab/schemas';
import en from '@/i18n/locales/en.json';
import { ApiError } from '@/lib/errors';

jest.mock('@/features/lab/api');
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

const product = (id: number, title: string): Product => ({
  id,
  title,
  description: 'd',
  category: 'c',
  price: 10,
  rating: 4,
  thumbnail: 'https://cdn.dummyjson.com/p.webp',
});

// resetAllMocks would also wipe FlashList's jest layout mocks, so reset only the api mocks.
const resetApiMocks = () =>
  Object.values(api).forEach((fn) => typeof fn === 'function' && (fn as jest.Mock).mockReset());

let queryClient: QueryClient;

async function renderScreen() {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ProductsScreen />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
});
afterEach(() => {
  queryClient.clear();
  onlineManager.setOnline(true);
  jest.restoreAllMocks();
  resetApiMocks();
});

describe('ProductsScreen', () => {
  it('shows the loading state while the first request is in flight', async () => {
    (api.fetchProducts as jest.Mock).mockReturnValue(new Promise(() => undefined));
    await renderScreen();
    expect(screen.getByRole('progressbar')).toBeTruthy();
  });

  it('shows the products and opens the detail on press', async () => {
    (api.fetchProducts as jest.Mock).mockResolvedValue({
      products: [product(1, 'Phone'), product(2, 'Laptop')],
    });
    await renderScreen();
    expect(await screen.findByText('Phone')).toBeTruthy();
    expect(screen.getByText('Laptop')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Phone, c, $10.00' }));
    expect(mockPush).toHaveBeenCalledWith('/lab/1');
  });

  it('shows the empty state with the query when nothing matches', async () => {
    (api.fetchProducts as jest.Mock).mockResolvedValue({ products: [] });
    await renderScreen();
    expect(await screen.findByText(en.lab.products.emptyTitle)).toBeTruthy();
  });

  it('shows the error state and retries', async () => {
    (api.fetchProducts as jest.Mock).mockRejectedValueOnce(new ApiError(500, 'Server down', null));
    await renderScreen();
    expect(await screen.findByText('Server down')).toBeTruthy();
    (api.fetchProducts as jest.Mock).mockResolvedValue({ products: [product(1, 'Phone')] });
    await fireEvent.press(screen.getByText(en.errors.retry));
    expect(await screen.findByText('Phone')).toBeTruthy();
  });

  it('shows the paused state when offline with no data', async () => {
    onlineManager.setOnline(false);
    (api.fetchProducts as jest.Mock).mockResolvedValue({ products: [] });
    await renderScreen();
    expect(await screen.findByText(en.lab.products.pausedTitle)).toBeTruthy();
    expect(api.fetchProducts).not.toHaveBeenCalled();
  });

  it('logs the time to the first real content once', async () => {
    (api.fetchProducts as jest.Mock).mockResolvedValue({ products: [product(1, 'Phone')] });
    await renderScreen();
    await screen.findByText('Phone');
    await act(async () => undefined);
    const logs = (console.log as jest.Mock).mock.calls
      .filter(([tag]) => tag === '[BENCH]')
      .map(([, json]) => JSON.parse(json as string))
      .filter((entry) => entry.event === 'products-content');
    expect(logs).toHaveLength(1);
    expect(logs[0].ms).toEqual(expect.any(Number));
  });

  it('has a labelled search field', async () => {
    (api.fetchProducts as jest.Mock).mockResolvedValue({ products: [] });
    await renderScreen();
    expect(screen.getByLabelText(en.lab.products.searchLabel)).toBeTruthy();
  });
});
