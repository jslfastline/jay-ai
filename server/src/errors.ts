export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, options?: { code?: string; status?: number }) {
    super(message);
    this.name = 'ApiError';
    this.code = options?.code ?? 'error';
    this.status = options?.status ?? 500;
  }
}
