import { fireEvent, render, screen } from '@testing-library/react-native';

import '@/i18n';
import en from '@/i18n/locales/en.json';

import { RouteError } from './index';

describe('RouteError', () => {
  it('shows a selectable error message and retries', async () => {
    const retry = jest.fn(() => Promise.resolve());
    await render(<RouteError error={new Error('boom')} retry={retry} />);
    expect(screen.getByText(en.errors.title)).toBeTruthy();
    expect(screen.getByText('boom').props.selectable).toBe(true);
    await fireEvent.press(screen.getByText(en.errors.retry));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
