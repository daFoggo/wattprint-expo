import { onlineManager } from '@tanstack/react-query';
import * as Network from 'expo-network';

// Recipe from https://tanstack.com/query/latest/docs/framework/react/react-native (expo-network).
export function networkListener(setOnline: (online: boolean) => void): () => void {
  let initialised = false;

  const eventSubscription = Network.addNetworkStateListener((state) => {
    initialised = true;
    setOnline(!!state.isConnected);
  });

  Network.getNetworkStateAsync()
    .then((state) => {
      if (!initialised) {
        setOnline(!!state.isConnected);
      }
    })
    .catch(() => {
      // getNetworkStateAsync can reject on some platforms/SDK versions
    });

  return eventSubscription.remove;
}

// Call once at startup, outside any component.
export function initOnlineManager(): void {
  onlineManager.setEventListener(networkListener);
}
