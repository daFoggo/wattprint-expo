import { formatNumber } from './format';

test('formats numbers with the locale separators', () => {
  expect(formatNumber(1234.5, 'en', { maximumFractionDigits: 1 })).toBe('1,234.5');
  expect(formatNumber(1234.5, 'vi', { maximumFractionDigits: 1 })).toBe('1.234,5');
});
