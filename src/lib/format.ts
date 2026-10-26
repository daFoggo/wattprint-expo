// Shared by the devices and energy features (both format watts and kWh).
export function formatNumber(
  value: number,
  locale: string,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

// The currency decides the fraction digits (VND none, USD two); do not override them here.
export function formatCurrency(value: number, locale: string, currency: string): string {
  return formatNumber(value, locale, { style: 'currency', currency });
}
