import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import '@/i18n';
import * as api from '@/features/lab/api';
import { labKeys } from '@/features/lab/queries';
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

async function renderScreen(staleTime = 0, seed?: (qc: QueryClient) => void) {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime } } });
  seed?.(queryClient);
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
    expect(await screen.findByText(en.states.pausedTitle)).toBeTruthy();
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

  const benchEntries = (event: string) =>
    (console.log as jest.Mock).mock.calls
      .filter(([tag]) => tag === '[BENCH]')
      .map(([, json]) => JSON.parse(json as string))
      .filter((entry) => entry.event === event);

  it('marks content that was fetched after mount as not from cache', async () => {
    (api.fetchProducts as jest.Mock).mockResolvedValue({ products: [product(1, 'Phone')] });
    await renderScreen();
    await screen.findByText('Phone');
    await act(async () => undefined);
    expect(benchEntries('products-content')[0].fromCache).toBe(false);
  });

  it('marks content served from a fresh cache as fromCache', async () => {
    await renderScreen(Infinity, (qc) =>
      qc.setQueryData(labKeys.productList({ q: '', limit: 30 }), {
        products: [product(1, 'Phone')],
      }),
    );
    await screen.findByText('Phone');
    await act(async () => undefined);
    expect(api.fetchProducts).not.toHaveBeenCalled();
    expect(benchEntries('products-content')[0].fromCache).toBe(true);
  });

  it('keeps the rows and says so when a refresh fails', async () => {
    (api.fetchProducts as jest.Mock).mockResolvedValueOnce({ products: [product(1, 'Phone')] });
    await renderScreen();
    await screen.findByText('Phone');
    (api.fetchProducts as jest.Mock).mockRejectedValue(new Error('boom'));
    await act(async () => {
      await queryClient.refetchQueries();
    });
    expect(await screen.findByText(en.lab.products.refreshFailed)).toBeTruthy();
    expect(screen.getByText('Phone')).toBeTruthy();
  });

  it('keeps the rows and shows the offline banner when a refresh is paused', async () => {
    (api.fetchProducts as jest.Mock).mockResolvedValue({ products: [product(1, 'Phone')] });
    await renderScreen();
    await screen.findByText('Phone');
    onlineManager.setOnline(false);
    await act(async () => {
      void queryClient.invalidateQueries();
    });
    expect(await screen.findByText(en.lab.products.offlineBanner)).toBeTruthy();
    expect(screen.getByText('Phone')).toBeTruthy();
  });

  it('names the searched query in the empty state, and shows a neutral banner while loading it', async () => {
    (api.fetchProducts as jest.Mock).mockResolvedValue({ products: [product(1, 'Phone')] });
    let resolveSearch: (value: { products: Product[] }) => void = () => undefined;
    (api.searchProducts as jest.Mock).mockReturnValue(
      new Promise((resolve) => {
        resolveSearch = resolve;
      }),
    );
    await renderScreen();
    await screen.findByText('Phone');
    await fireEvent.changeText(screen.getByLabelText(en.lab.products.searchLabel), 'zzz');
    // Previous rows stay, with a banner that does not claim anything about 'zzz'.
    expect(await screen.findByText(en.lab.products.updating)).toBeTruthy();
    expect(screen.getByText('Phone')).toBeTruthy();
    expect(screen.queryByText(/zzz./)).toBeNull();
    await act(async () => resolveSearch({ products: [] }));
    await waitFor(() => expect(screen.getByText('Nothing matches "zzz".')).toBeTruthy());
    expect(screen.queryByText(en.lab.products.updating)).toBeNull();
  });

  it('has a labelled search field', async () => {
    (api.fetchProducts as jest.Mock).mockResolvedValue({ products: [] });
    await renderScreen();
    expect(screen.getByLabelText(en.lab.products.searchLabel)).toBeTruthy();
  });
});
