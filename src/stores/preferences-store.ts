import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { zustandStorage } from '@/lib/storage';

export type ThemePreference = 'system' | 'light' | 'dark';

type PreferencesState = {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
};

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'preferences', storage: createJSONStorage(() => zustandStorage) },
  ),
);
