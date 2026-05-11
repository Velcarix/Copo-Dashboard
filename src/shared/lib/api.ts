import { useAuthStore } from '@/shared/store/authStore'

const BASE_URL = import.meta.env.VITE_API_URL
if (!BASE_URL) throw new Error('VITE_API_URL is not set')

interface RequestOptions extends RequestInit {
  skipAuth?: boolean
}

class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { skipAuth = false, ...fetchOptions } = options
  const headers = new Headers(fetchOptions.headers)

  if (!headers.has('Content-Type') && fetchOptions.body) {
    headers.set('Content-Type', 'application/json')
  }

  if (!skipAuth) {
    const token = useAuthStore.getState().accessToken
    if (token) headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...fetchOptions,
    headers,
  })

  if (!response.ok) {
    let errorBody: { error?: { code: string; message: string; details?: unknown } } = {}
    try { errorBody = await response.json() } catch { /* ignore */ }
    throw new ApiError(
      errorBody.error?.code ?? 'UNKNOWN_ERROR',
      errorBody.error?.message ?? `HTTP ${response.status}`,
      response.status,
      errorBody.error?.details,
    )
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export const api = {
  get:    <T>(path: string, opts?: RequestOptions) => request<T>(path, { ...opts, method: 'GET' }),
  post:   <T>(path: string, body: unknown, opts?: RequestOptions) =>
            request<T>(path, { ...opts, method: 'POST', body: JSON.stringify(body) }),
  put:    <T>(path: string, body: unknown, opts?: RequestOptions) =>
            request<T>(path, { ...opts, method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string, opts?: RequestOptions) => request<T>(path, { ...opts, method: 'DELETE' }),
}

export { ApiError }
