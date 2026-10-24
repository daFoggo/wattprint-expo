import { storage, zustandStorage } from '@/lib/storage';

import { usePreferencesStore } from './preferences-store';

describe('preferences store', () => {
  beforeEach(() => {
    storage.clearAll();
    usePreferencesStore.setState({ theme: 'system' });
  });

  it('defaults to system', () => expect(usePreferencesStore.getState().theme).toBe('system'));

  it('persists theme to MMKV', () => {
    usePreferencesStore.getState().setTheme('dark');
    expect(JSON.parse(zustandStorage.getItem('preferences') as string).state.theme).toBe('dark');
  });
});
