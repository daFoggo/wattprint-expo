import { useAuthStore } from './auth-store';

const user = { id: 'u1', email: 'a@example.com', full_name: 'An', is_active: true, roles: [] };

beforeEach(() => useAuthStore.setState({ status: 'unknown', user: null }));

describe('auth store', () => {
  it('starts unknown', () => {
    expect(useAuthStore.getState()).toMatchObject({ status: 'unknown', user: null });
  });

  it('is signed in with or without a loaded user', () => {
    useAuthStore.getState().setSignedIn();
    expect(useAuthStore.getState()).toMatchObject({ status: 'signedIn', user: null });
    useAuthStore.getState().setSignedIn(user);
    expect(useAuthStore.getState()).toMatchObject({ status: 'signedIn', user });
  });

  it('drops the user on sign-out', () => {
    useAuthStore.getState().setSignedIn(user);
    useAuthStore.getState().setSignedOut();
    expect(useAuthStore.getState()).toMatchObject({ status: 'signedOut', user: null });
  });
});
