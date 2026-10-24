import { onlineManager } from '@tanstack/react-query';
import * as Network from 'expo-network';

import { initOnlineManager, networkListener } from './online-manager';

jest.mock('expo-network', () => ({
  addNetworkStateListener: jest.fn(),
  getNetworkStateAsync: jest.fn(),
}));

const addListener = jest.mocked(Network.addNetworkStateListener);
const getState = jest.mocked(Network.getNetworkStateAsync);

type Handler = (state: Network.NetworkState) => void;
let emit: Handler = () => {};
const remove = jest.fn();

beforeEach(() => {
  remove.mockReset();
  addListener.mockImplementation((handler: Handler) => {
    emit = handler;
    return { remove };
  });
  getState.mockResolvedValue({ isConnected: true } as Network.NetworkState);
});

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('networkListener', () => {
  it('forwards live connectivity events as booleans', async () => {
    const setOnline = jest.fn();
    networkListener(setOnline);
    emit({ isConnected: false } as Network.NetworkState);
    emit({ isConnected: undefined } as Network.NetworkState);
    emit({ isConnected: true } as Network.NetworkState);
    expect(setOnline.mock.calls.map(([v]) => v)).toEqual([false, false, true]);
    await flush();
  });

  it('reads the current state once when no event arrived yet', async () => {
    getState.mockResolvedValue({ isConnected: false } as Network.NetworkState);
    const setOnline = jest.fn();
    networkListener(setOnline);
    await flush();
    expect(setOnline).toHaveBeenCalledTimes(1);
    expect(setOnline).toHaveBeenCalledWith(false);
  });

  it('ignores a stale initial state when an event came first', async () => {
    getState.mockResolvedValue({ isConnected: true } as Network.NetworkState);
    const setOnline = jest.fn();
    networkListener(setOnline);
    emit({ isConnected: false } as Network.NetworkState);
    await flush();
    expect(setOnline.mock.calls.map(([v]) => v)).toEqual([false]);
  });

  it('swallows a rejected initial state read', async () => {
    getState.mockRejectedValue(new Error('unsupported'));
    const setOnline = jest.fn();
    expect(() => networkListener(setOnline)).not.toThrow();
    await flush();
    expect(setOnline).not.toHaveBeenCalled();
  });

  it('returns a function that removes the subscription', async () => {
    const unsubscribe = networkListener(jest.fn());
    unsubscribe();
    expect(remove).toHaveBeenCalledTimes(1);
    await flush();
  });
});

describe('initOnlineManager', () => {
  it('registers the listener so the manager follows the network', async () => {
    initOnlineManager();
    onlineManager.setOnline(true);
    emit({ isConnected: false } as Network.NetworkState);
    expect(onlineManager.isOnline()).toBe(false);
    emit({ isConnected: true } as Network.NetworkState);
    expect(onlineManager.isOnline()).toBe(true);
    await flush();
  });
});
