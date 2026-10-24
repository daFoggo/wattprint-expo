import { zustandStorage } from './storage';

describe('storage', () => {
  it('round-trips through zustandStorage', () => {
    zustandStorage.setItem('k', 'v');
    expect(zustandStorage.getItem('k')).toBe('v');
    zustandStorage.removeItem('k');
    expect(zustandStorage.getItem('k')).toBeNull();
  });
});
