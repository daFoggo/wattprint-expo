import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useDebouncedValue } from '@tanstack/react-pacer';
import { useState } from 'react';

import { PRODUCT_PAGE_LIMIT, productListQueryOptions } from '@/features/lab/queries';

export const SEARCH_DEBOUNCE_MS = 300;

// `text` follows the keystrokes; the query only sees the value after 300 ms without typing, and keeps
// showing the previous results while the next ones load.
export function useProductSearch() {
  const [text, setText] = useState('');
  const [debounced] = useDebouncedValue(text, { wait: SEARCH_DEBOUNCE_MS });
  const q = debounced.trim();
  const query = useQuery({
    ...productListQueryOptions({ q, limit: PRODUCT_PAGE_LIMIT }),
    placeholderData: keepPreviousData,
  });
  return { text, setText, q, query };
}
