import { fireEvent, render, screen } from '@testing-library/react-native';

import '@/i18n';
import { ApiError, NetworkError } from '@/lib/errors';
import en from '@/i18n/locales/en.json';

import { EmptyState } from './empty-state';
import { ErrorState } from './error-state';
import { LoadingState } from './loading-state';

describe('LoadingState', () => {
  it('is an accessible progress indicator with a label', async () => {
    await render(<LoadingState />);
    const indicator = screen.getByRole('progressbar');
    expect(indicator.props.accessibilityLabel).toBe(en.states.loading);
  });

  it('accepts a custom label', async () => {
    await render(<LoadingState label="Loading usage" />);
    expect(screen.getByLabelText('Loading usage')).toBeTruthy();
  });
});

describe('EmptyState', () => {
  it('shows a default title and optional description', async () => {
    await render(<EmptyState description="Add a reading" />);
    expect(screen.getByText(en.states.emptyTitle)).toBeTruthy();
    expect(screen.getByText('Add a reading')).toBeTruthy();
  });

  it('renders an action button and calls it', async () => {
    const onAction = jest.fn();
    await render(<EmptyState title="No data" actionLabel="Add" onAction={onAction} />);
    expect(screen.getByRole('header')).toHaveTextContent('No data');
    await fireEvent.press(screen.getByText('Add'));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('hides the action when there is no handler', async () => {
    await render(<EmptyState title="No data" actionLabel="Add" />);
    expect(screen.queryByText('Add')).toBeNull();
  });
});

describe('ErrorState', () => {
  it('shows the title and a selectable error message', async () => {
    await render(<ErrorState error={new Error('boom')} />);
    expect(screen.getByText(en.errors.title)).toBeTruthy();
    expect(screen.getByText('boom').props.selectable).toBe(true);
  });

  it('uses a friendly message for network errors and the API detail for API errors', async () => {
    const { rerender } = await render(<ErrorState error={new NetworkError('x')} />);
    expect(screen.getByText(en.errors.network)).toBeTruthy();
    await rerender(<ErrorState error={new ApiError(404, 'Item not found', null)} />);
    expect(screen.getByText('Item not found')).toBeTruthy();
  });

  it('retries on press, and hides the button without a handler', async () => {
    const onRetry = jest.fn();
    const { rerender } = await render(<ErrorState error={new Error('x')} onRetry={onRetry} />);
    await fireEvent.press(screen.getByText(en.errors.retry));
    expect(onRetry).toHaveBeenCalledTimes(1);
    await rerender(<ErrorState error={new Error('x')} />);
    expect(screen.queryByText(en.errors.retry)).toBeNull();
  });

  it('announces itself to screen readers', async () => {
    await render(<ErrorState error={new Error('x')} />);
    expect(screen.getByText('x').props.accessibilityLiveRegion).toBe('polite');
  });
});
