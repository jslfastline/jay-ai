import { AppConfig } from '@/config';

/** Error thrown by the API layer. Never contains secrets. */
export class ApiError extends Error {
  readonly code: string;
  readonly status?: number;

  constructor(message: string, options?: { code?: string; status?: number }) {
    super(message);
    this.name = 'ApiError';
    this.code = options?.code ?? 'unknown';
    this.status = options?.status;
  }
}

export interface RequestOptions extends Omit<RequestInit, 'signal'> {
  timeoutMs?: number;
  signal?: AbortSignal;
}

function joinUrl(base: string, path: string): string {
  const normalizedBase = base.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

/**
 * Thin fetch wrapper used by every real-network call.
 *
 * - Adds a timeout so the UI never hangs forever.
 * - Normalises failures into `ApiError`.
 * - Refuses to run when no backend is configured (we never guess a URL).
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const base = AppConfig.apiBaseUrl;
  if (!base) {
    throw new ApiError('No backend is configured. The app is running in mock mode.', {
      code: 'no_backend',
    });
  }

  const { timeoutMs = AppConfig.requestTimeoutMs, signal, headers, ...rest } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const onExternalAbort = () => controller.abort();
  signal?.addEventListener('abort', onExternalAbort);

  try {
    const response = await fetch(joinUrl(base, path), {
      ...rest,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(headers ?? {}),
      },
      signal: controller.signal,
    });

    const text = await response.text();
    const data = text ? safeParse(text) : null;

    if (!response.ok) {
      const rawMessage =
        data && typeof data === 'object' && 'message' in data
          ? (data as { message: unknown }).message
          : undefined;
      const rawCode =
        data && typeof data === 'object' && 'code' in data
          ? (data as { code: unknown }).code
          : undefined;
      const message =
        typeof rawMessage === 'string'
          ? rawMessage
          : `Request failed with status ${response.status}`;
      throw new ApiError(message, {
        code: typeof rawCode === 'string' ? rawCode : 'http_error',
        status: response.status,
      });
    }

    return data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    const err = error as Error;
    if (err.name === 'AbortError') {
      throw new ApiError('The request timed out. Please try again.', { code: 'timeout' });
    }
    throw new ApiError('Network error. Check your connection and try again.', { code: 'network' });
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', onExternalAbort);
  }
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
