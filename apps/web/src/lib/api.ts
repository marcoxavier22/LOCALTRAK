import { getToken, logout } from './auth';

const LEGACY_RENDER_API_URL = 'https://localtrak-api.onrender.com';
const CURRENT_RENDER_API_URL = 'https://localtrak.onrender.com';

function resolveApiUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333';
  return configuredUrl === LEGACY_RENDER_API_URL ? CURRENT_RENDER_API_URL : configuredUrl;
}

const API_URL = resolveApiUrl();

type ApiOptions = RequestInit & {
  skipAuth?: boolean;
};

export class ApiError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status: number, details: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { skipAuth, headers, body, ...rest } = options;
  const token = getToken();
  const requestHeaders = new Headers(headers);

  if (!requestHeaders.has('Content-Type') && body) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  if (!skipAuth && token) {
    requestHeaders.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...rest,
    body,
    headers: requestHeaders,
  });

  if (response.status === 401) {
    logout();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }

  const contentType = response.headers.get('content-type');
  const payload = contentType?.includes('application/json') ? await response.json() : null;

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'message' in payload
        ? String(payload.message)
        : 'Erro ao comunicar com a API.';

    throw new ApiError(message, response.status, payload);
  }

  return payload as T;
}

export function toJsonBody(data: unknown) {
  return JSON.stringify(data);
}
