import { focusManager } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';

import { useAppStateFocus } from './use-app-state-focus';

describe('useAppStateFocus', () => {
  it('maps AppState to focusManager', async () => {
    const remove = jest.fn();
    let handler!: (s: string) => void;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_, h) => {
      handler = h as never;
      return { remove } as never;
    });
    const { unmount } = await renderHook(() => useAppStateFocus());
    await act(async () => handler('background'));
    expect(focusManager.isFocused()).toBe(false);
    await act(async () => handler('active'));
    expect(focusManager.isFocused()).toBe(true);
    await unmount();
    expect(remove).toHaveBeenCalled();
  });
});
