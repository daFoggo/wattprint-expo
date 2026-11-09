import { act, renderHook } from '@testing-library/react-native';

import { bootstrapAuth, clearUserScope } from '@/lib/session';
import { useAuthStore } from '@/stores/auth-store';

import { SESSION_WAIT_MS, useSessionGate } from './use-session-gate';

jest.mock('@/lib/session', () => ({ clearUserScope: jest.fn(), bootstrapAuth: jest.fn() }));

const mockClear = clearUserScope as unknown as jest.Mock;
const mockBootstrap = bootstrapAuth as unknown as jest.Mock;

const user = (id: string) => ({
  id,
  email: `${id}@example.com`,
  full_name: null,
  is_active: true,
  roles: [],
});

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  useAuthStore.setState({ status: 'unknown', user: null });
});
afterEach(() => jest.useRealTimers());

describe('useSessionGate', () => {
  it('starts the bootstrap once on mount', async () => {
    await renderHook(() => useSessionGate());
    expect(mockBootstrap).toHaveBeenCalledTimes(1);
  });

  it('is ready at once when a stored session was found (works offline)', async () => {
    useAuthStore.setState({ status: 'signedIn' });
    const { result } = await renderHook(() => useSessionGate());
    expect(result.current).toEqual({ ready: true, signedIn: true });
  });

  it('is signed out and ready when nothing is stored', async () => {
    useAuthStore.setState({ status: 'signedOut' });
    const { result } = await renderHook(() => useSessionGate());
    expect(result.current).toEqual({ ready: true, signedIn: false });
  });

  it('waits while the stored session is still being read', async () => {
    const { result } = await renderHook(() => useSessionGate());
    expect(result.current).toEqual({ ready: false, signedIn: false });
  });

  it('becomes ready when the bootstrap answers', async () => {
    const { result } = await renderHook(() => useSessionGate());
    await act(async () => useAuthStore.getState().setSignedIn());
    expect(result.current).toEqual({ ready: true, signedIn: true });
  });

  it('gives up waiting after the timeout so an unreadable store cannot hang the splash', async () => {
    const { result } = await renderHook(() => useSessionGate());
    await act(async () => {
      jest.advanceTimersByTime(SESSION_WAIT_MS);
    });
    expect(result.current).toEqual({ ready: true, signedIn: false });
  });

  it('stays ready when the status is later reset to unknown', async () => {
    useAuthStore.setState({ status: 'signedOut' });
    const { result } = await renderHook(() => useSessionGate());
    await act(async () => useAuthStore.setState({ status: 'unknown' }));
    expect(result.current.ready).toBe(true);
  });

  it('clears the user scope when the signed-in user changes or signs out', async () => {
    useAuthStore.setState({ status: 'signedIn', user: user('u1') });
    await renderHook(() => useSessionGate());
    expect(mockClear).not.toHaveBeenCalled();

    await act(async () => useAuthStore.getState().setSignedIn(user('u2')));
    expect(mockClear).toHaveBeenCalledTimes(1);

    await act(async () => useAuthStore.getState().setSignedOut());
    expect(mockClear).toHaveBeenCalledTimes(2);
  });

  it('clears the user scope when a session found at start-up ends', async () => {
    useAuthStore.setState({ status: 'signedIn', user: null });
    await renderHook(() => useSessionGate());
    await act(async () => useAuthStore.getState().setSignedOut());
    expect(mockClear).toHaveBeenCalledTimes(1);
  });

  it('does not clear while the same user stays signed in, nor when a session begins', async () => {
    const { rerender } = await renderHook(() => useSessionGate());
    await act(async () => useAuthStore.getState().setSignedOut());
    await act(async () => useAuthStore.getState().setSignedIn(user('u1')));
    await act(async () => useAuthStore.getState().setSignedIn(user('u1')));
    await rerender({});
    expect(mockClear).not.toHaveBeenCalled();
  });
});
