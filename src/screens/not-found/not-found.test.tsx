import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import '@/i18n';
import en from '@/i18n/locales/en.json';

import { NotFound } from './index';

jest.mock('expo-router', () => ({ router: { replace: jest.fn() } }));

describe('NotFound', () => {
  it('shows the message and goes home', async () => {
    await render(<NotFound />);
    expect(screen.getByText(en.notFound.title)).toBeTruthy();
    expect(screen.getByText(en.notFound.message)).toBeTruthy();
    await fireEvent.press(screen.getByText(en.notFound.goHome));
    expect(router.replace).toHaveBeenCalledWith('/');
  });
});
