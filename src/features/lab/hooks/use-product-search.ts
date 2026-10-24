import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDebouncedValue } from '@tanstack/react-pacer';
import { useState } from 'react';

import { PRODUCT_PAGE_LIMIT, labKeys, productListQueryOptions } from '@/features/lab/queries';
import type { ProductList } from '@/features/lab/schemas';

export const SEARCH_DEBOUNCE_MS = 300;

// `text` follows the keystrokes; the query only sees the value after 300 ms without typing, and keeps
// showing the previous results while the next ones load. `shownQ` is the query the visible rows
// belong to (the previous one while `query.isPlaceholderData`), so copy next to the rows never
// names a query they do not answer.
export function useProductSearch() {
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [debounced] = useDebouncedValue(text, { wait: SEARCH_DEBOUNCE_MS });
  const q = debounced.trim();
  const query = useQuery({
    ...productListQueryOptions({ q, limit: PRODUCT_PAGE_LIMIT }),
    placeholderData: keepPreviousData,
  });

  // The placeholder rows are the data of another cached list query: find it by identity.
  let shownQ = q;
  if (query.isPlaceholderData) {
    const lists = queryClient.getQueriesData<ProductList>({
      queryKey: [...labKeys.products(), 'list'],
    });
    const source = lists.find(([, data]) => data === query.data);
    shownQ = (source?.[0][3] as { q: string } | undefined)?.q ?? '';
  }

  return { text, setText, q, shownQ, query };
}
