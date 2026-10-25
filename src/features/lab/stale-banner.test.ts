import { staleBanner } from '@/features/lab/stale-banner';

const base = { data: [], isPlaceholderData: false, isError: false, fetchStatus: 'idle' as const };

describe('staleBanner', () => {
  it('shows nothing without data or when the data is fresh', () => {
    expect(staleBanner({ ...base, data: undefined, isError: true })).toBeNull();
    expect(staleBanner({ ...base, data: undefined, fetchStatus: 'paused' })).toBeNull();
    expect(staleBanner(base)).toBeNull();
  });

  it('says rows are from a previous query while placeholder data shows', () => {
    expect(staleBanner({ ...base, isPlaceholderData: true, isError: true })).toBe(
      'lab.products.updating',
    );
  });

  it('says the refresh failed when cached data stays after an error', () => {
    expect(staleBanner({ ...base, isError: true, fetchStatus: 'paused' })).toBe(
      'lab.products.refreshFailed',
    );
  });

  it('says the device is offline when a refresh is paused', () => {
    expect(staleBanner({ ...base, fetchStatus: 'paused' })).toBe('lab.products.offlineBanner');
  });
});
