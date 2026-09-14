export class ApiError extends Error {
  constructor(message: string, public readonly code: string, public readonly correlationId: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function request<T>(path: string, token?: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15_000);
  const signal = options.signal ? AbortSignal.any([options.signal, controller.signal]) : controller.signal;
  const correlationId = crypto.randomUUID();
  try {
    const response = await fetch(`/api${path}`, {
      ...options,
      signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-ID': correlationId,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
    const result: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      if (response.status === 401 && token) window.dispatchEvent(new Event('workforce:session-expired'));
      const error = result as { message?: string; code?: string; correlationId?: string } | null;
      throw new ApiError(error?.message ?? `The request failed (${response.status}). Please try again.`,
        error?.code ?? 'HTTP_ERROR', error?.correlationId ?? response.headers.get('X-Correlation-ID') ?? correlationId);
    }
    return result as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (options.signal?.aborted) throw error;
    throw new ApiError(controller.signal.aborted ? 'The request took too long. Please try again.' :
      'Unable to reach WorkforceOps. Check your connection and try again.', 'NETWORK_ERROR', correlationId);
  } finally {
    window.clearTimeout(timeout);
  }
}

export function post<T>(path: string, token?: string, body?: unknown): Promise<T> {
  return request<T>(path, token, { method: 'POST', ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
