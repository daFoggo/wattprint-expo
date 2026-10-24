import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import '@/i18n';
import en from '@/i18n/locales/en.json';

import { SampleForm } from './sample-form';

describe('SampleForm', () => {
  const onSubmit = jest.fn();

  beforeEach(() => onSubmit.mockClear());
  afterEach(() => jest.useRealTimers());

  async function typeEmail(value: string) {
    await render(<SampleForm onSubmit={onSubmit} />);
    await fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), value);
  }

  it('shows error and blocks submit for invalid email', async () => {
    await typeEmail('abc');
    await fireEvent.press(screen.getByText(en.form.submit));
    expect(await screen.findByTestId('email-error')).toHaveTextContent(en.form.emailInvalid);
    expect(screen.getByTestId('email-field').props['data-invalid']).toBe('true');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits a valid email', async () => {
    await typeEmail('a@b.co');
    await fireEvent.press(screen.getByText(en.form.submit));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ email: 'a@b.co' }));
  });

  it('debounces the echo by 300 ms', async () => {
    jest.useFakeTimers();
    await typeEmail('a@b.co');
    expect(screen.getByTestId('email-echo')).toHaveTextContent('');
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    expect(screen.getByTestId('email-echo')).toHaveTextContent('a@b.co');
  });
});
