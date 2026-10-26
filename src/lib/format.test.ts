import { formatCurrency, formatNumber } from './format';

test('formats numbers with the locale separators', () => {
  expect(formatNumber(1234.5, 'en', { maximumFractionDigits: 1 })).toBe('1,234.5');
  expect(formatNumber(1234.5, 'vi', { maximumFractionDigits: 1 })).toBe('1.234,5');
});

test('formats currency with the digits the currency defines', () => {
  expect(formatCurrency(35725.5, 'en', 'VND')).toBe('₫35,726');
  expect(formatCurrency(35725.5, 'vi', 'VND')).toBe('35.726 ₫');
  expect(formatCurrency(12.345, 'en', 'USD')).toBe('$12.35');
});
