// src/lib/api.ts
const API_BASE = 'http://localhost:3000/api/v1';

export class ApiError extends Error {
  status: number;
  message: string;
  fields?: Record<string, string>;

  constructor(
    status: number,
    message: string,
    fields?: Record<string, string>
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.message = message;
    this.fields = fields;
  }
}

interface FetchOptions extends RequestInit {
  data?: unknown;
  idempotencyKey?: string;
  preventAutoRedirect?: boolean;
}

export const api = {
  get: <T = any>(endpoint: string, options?: FetchOptions) => request<T>(endpoint, { ...options, method: 'GET' }),
  post: <T = any>(endpoint: string, options?: FetchOptions) => request<T>(endpoint, { ...options, method: 'POST' }),
  put: <T = any>(endpoint: string, options?: FetchOptions) => request<T>(endpoint, { ...options, method: 'PUT' }),
  patch: <T = any>(endpoint: string, options?: FetchOptions) => request<T>(endpoint, { ...options, method: 'PATCH' }),
  delete: <T = any>(endpoint: string, options?: FetchOptions) => request<T>(endpoint, { ...options, method: 'DELETE' }),
};

async function request<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const token = localStorage.getItem('rp_access_token');
  
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && !(options.data instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  if (options.idempotencyKey) {
    headers.set('Idempotency-Key', options.idempotencyKey);
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  if (options.data && !(options.data instanceof FormData)) {
    config.body = JSON.stringify(options.data);
  } else if (options.data instanceof FormData) {
    config.body = options.data;
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);

    if (response.status === 401 && !options.preventAutoRedirect) {
      if (!endpoint.includes('/auth/login')) {
        localStorage.removeItem('rp_access_token');
        window.location.href = '/login';
        throw new ApiError(401, 'Session expired. Please log in again.');
      }
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new ApiError(
        response.status,
        data.error || 'An unexpected error occurred',
        data.fields
      );
    }

    return data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      500,
      error instanceof Error ? error.message : 'Network error'
    );
  }
}
