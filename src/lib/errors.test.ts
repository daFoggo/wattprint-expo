import { ApiError, ContractError, NetworkError, isRetryable } from './errors';

describe('errors', () => {
  it('carries status, detail and body on ApiError', () => {
    const error = new ApiError(422, [{ loc: ['body', 'x'], msg: 'bad', type: 'value_error' }], {
      detail: 'x',
    });
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ApiError');
    expect(error.status).toBe(422);
    expect(error.message).toBe('bad');
    expect(error.body).toEqual({ detail: 'x' });
  });

  it('uses a string detail as the message and falls back to the status', () => {
    expect(new ApiError(404, 'Not found', null).message).toBe('Not found');
    expect(new ApiError(500, undefined, null).message).toBe('HTTP 500');
  });

  it('keeps the cause on NetworkError and the issues on ContractError', () => {
    const cause = new TypeError('Network request failed');
    expect(new NetworkError('offline', { cause }).cause).toBe(cause);
    expect(new ContractError('bad shape', [{ message: 'x' }]).issues).toEqual([{ message: 'x' }]);
  });
});

describe('isRetryable', () => {
  it('retries network errors and 5xx only', () => {
    expect(isRetryable(new NetworkError('offline'))).toBe(true);
    expect(isRetryable(new ApiError(500, undefined, null))).toBe(true);
    expect(isRetryable(new ApiError(503, undefined, null))).toBe(true);
    expect(isRetryable(new ApiError(400, undefined, null))).toBe(false);
    expect(isRetryable(new ApiError(401, undefined, null))).toBe(false);
    expect(isRetryable(new ApiError(404, undefined, null))).toBe(false);
    expect(isRetryable(new ApiError(429, undefined, null))).toBe(false);
  });

  it('never retries contract failures, aborts or unknown errors', () => {
    expect(isRetryable(new ContractError('bad', []))).toBe(false);
    expect(isRetryable(new DOMException('aborted', 'AbortError'))).toBe(false);
    expect(isRetryable(new Error('x'))).toBe(false);
    expect(isRetryable('x')).toBe(false);
  });
});
