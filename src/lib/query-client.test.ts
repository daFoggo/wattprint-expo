import { ApiError, ContractError, NetworkError } from './errors';
import { createQueryClient, shouldRetry } from './query-client';

describe('shouldRetry', () => {
  it('retries retryable errors up to two times', () => {
    const error = new NetworkError('offline');
    expect(shouldRetry(0, error)).toBe(true);
    expect(shouldRetry(1, error)).toBe(true);
    expect(shouldRetry(2, error)).toBe(false);
  });

  it('retries 5xx but not 4xx or contract failures', () => {
    expect(shouldRetry(0, new ApiError(503, undefined, null))).toBe(true);
    expect(shouldRetry(0, new ApiError(404, undefined, null))).toBe(false);
    expect(shouldRetry(0, new ContractError('bad', []))).toBe(false);
  });
});

describe('createQueryClient', () => {
  it('sets the data-layer defaults', () => {
    const defaults = createQueryClient().getDefaultOptions();
    expect(defaults.queries?.staleTime).toBe(30_000);
    expect(defaults.queries?.retry).toBe(shouldRetry);
    expect(defaults.mutations?.retry).toBe(0);
  });
});
