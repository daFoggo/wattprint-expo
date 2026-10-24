type ValidationDetail = { loc?: unknown[]; msg: string; type?: string };

// FastAPI: `{detail: string}` or, for 422, `{detail: [{loc, msg, type}]}`.
export type ApiErrorDetail = string | ValidationDetail[] | undefined;

function detailMessage(status: number, detail: ApiErrorDetail): string {
  if (typeof detail === 'string' && detail.length > 0) return detail;
  if (Array.isArray(detail) && detail.length > 0) return detail.map((d) => d.msg).join(', ');
  return `HTTP ${status}`;
}

export class ApiError extends Error {
  readonly status: number;
  readonly detail: ApiErrorDetail;
  readonly body: unknown;

  constructor(status: number, detail: ApiErrorDetail, body: unknown) {
    super(detailMessage(status, detail));
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
    this.body = body;
  }
}

// The request never produced an HTTP response (offline, DNS, connection reset, timeout).
export class NetworkError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'NetworkError';
  }
}

// The response did not match the Zod schema (or was not JSON). The server broke the contract.
export class ContractError extends Error {
  readonly issues: unknown[];

  constructor(message: string, issues: unknown[]) {
    super(message);
    this.name = 'ContractError';
    this.issues = issues;
  }
}

export function isRetryable(error: unknown): boolean {
  if (error instanceof NetworkError) return true;
  return error instanceof ApiError && error.status >= 500;
}
