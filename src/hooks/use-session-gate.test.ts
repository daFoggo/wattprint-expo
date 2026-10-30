import { act, renderHook } from '@testing-library/react-native';

import { authClient } from '@/lib/auth-client';
import { clearUserScope } from '@/lib/session';

import { SESSION_WAIT_MS, useSessionGate } from './use-session-gate';

jest.mock('@/lib/auth-client', () => ({ authClient: { useSession: jest.fn() } }));
jest.mock('@/lib/session', () => ({ clearUserScope: jest.fn() }));

const useSession = authClient.useSession as unknown as jest.Mock;
const mockClear = clearUserScope as unknown as jest.Mock;

const user = (id: string) => ({ data: { user: { id } }, isPending: false });

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
});
afterEach(() => jest.useRealTimers());

describe('useSessionGate', () => {
  it('is ready at once for a cached session while the refetch is still pending', async () => {
    useSession.mockReturnValue({ data: { user: { id: 'u1' } }, isPending: true });
    const { result } = await renderHook(() => useSessionGate());
    expect(result.current).toEqual({ ready: true, signedIn: true });
  });

  it('is signed out and ready once the server says there is no session', async () => {
    useSession.mockReturnValue({ data: null, isPending: false });
    const { result } = await renderHook(() => useSessionGate());
    expect(result.current).toEqual({ ready: true, signedIn: false });
  });

  it('waits while there is no cached session and the first fetch is pending', async () => {
    useSession.mockReturnValue({ data: null, isPending: true });
    const { result } = await renderHook(() => useSessionGate());
    expect(result.current.ready).toBe(false);
  });

  it('gives up waiting after the timeout so an unreachable auth host cannot hang the splash', async () => {
    useSession.mockReturnValue({ data: null, isPending: true });
    const { result } = await renderHook(() => useSessionGate());
    await act(async () => {
      jest.advanceTimersByTime(SESSION_WAIT_MS);
    });
    expect(result.current).toEqual({ ready: true, signedIn: false });
  });

  it('stays ready when a later refetch makes the session pending again', async () => {
    useSession.mockReturnValue({ data: null, isPending: false });
    const { result, rerender } = await renderHook(() => useSessionGate());
    useSession.mockReturnValue({ data: null, isPending: true });
    await rerender({});
    expect(result.current.ready).toBe(true);
  });

  it('clears the user scope when the signed-in user changes or signs out', async () => {
    useSession.mockReturnValue(user('u1'));
    const { rerender } = await renderHook(() => useSessionGate());
    expect(mockClear).not.toHaveBeenCalled();

    useSession.mockReturnValue(user('u2'));
    await rerender({});
    expect(mockClear).toHaveBeenCalledTimes(1);

    useSession.mockReturnValue({ data: null, isPending: false });
    await rerender({});
    expect(mockClear).toHaveBeenCalledTimes(2);
  });

  it('does not clear the user scope while the same user stays signed in', async () => {
    useSession.mockReturnValue(user('u1'));
    const { rerender } = await renderHook(() => useSessionGate());
    useSession.mockReturnValue({ data: { user: { id: 'u1' } }, isPending: true });
    await rerender({});
    expect(mockClear).not.toHaveBeenCalled();
  });
});
