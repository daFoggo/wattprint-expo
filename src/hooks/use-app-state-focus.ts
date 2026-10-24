import { focusManager } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

export function useAppStateFocus(): void {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status: AppStateStatus) => {
      focusManager.setFocused(status === 'active');
    });
    return () => subscription.remove();
  }, []);
}
