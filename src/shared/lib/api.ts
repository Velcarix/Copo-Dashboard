import { useAuthStore } from '@/shared/store/authStore'

const BASE_URL: string = import.meta.env.VITE_API_URL ?? ''

const REFRESH_PATH = '/api/v1/auth/refresh'
// Endpoints que nunca deben disparar un refresh (evita loops de 401 sobre el
// propio endpoint de refresh, y no tiene sentido reintentar login/logout).
const NO_REFRESH_PATHS = [REFRESH_PATH, '/api/v1/auth/login', '/api/v1/auth/logout']

interface RequestOptions extends RequestInit {
  skipAuth?: boolean
  /** Uso interno — evita reintentar refresh infinitamente sobre la misma request. */
  _retried?: boolean
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

// Único refresh en vuelo compartido entre todas las requests que reciban 401 al
// mismo tiempo — evita "refresh storms" (N requests 401 simultáneas -> N refreshes
// en paralelo, con token rotation esto invalidaría refresh tokens entre sí).
let refreshPromise: Promise<string> | null = null

async function performRefresh(): Promise<string> {
  const branchId = useAuthStore.getState().branchId
  const response = await fetch(`${BASE_URL}${REFRESH_PATH}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(branchId ? { branchId } : {}),
  })

  if (!response.ok) {
    throw new ApiError('UNAUTHORIZED', 'No se pudo renovar la sesión', response.status)
  }

  const body = (await response.json()) as { data: { accessToken: string } }
  useAuthStore.getState().setAccessToken(body.data.accessToken)
  return body.data.accessToken
}

function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => { refreshPromise = null })
  }
  return refreshPromise
}

/** Sesión realmente terminada (refresh token inválido/revocado) — la única vez
 *  que forzamos al usuario de vuelta al login sin que él lo haya pedido. */
function forceLogout() {
  useAuthStore.getState().logout()
  if (!window.location.hash.startsWith('#/login')) {
    window.location.hash = '#/login'
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!BASE_URL) throw new ApiError('CONFIG_ERROR', 'VITE_API_URL no está configurada', 0)
  const { skipAuth = false, _retried = false, ...fetchOptions } = options
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
    // Necesario para que el navegador envíe/reciba la cookie httpOnly del refresh
    // token — sin esto queda descartada en cualquier request cross-origin (dashboard
    // y api corren en subdominios distintos de copopos.com).
    credentials: 'include',
  })

  if (response.status === 401 && !skipAuth && !_retried && !NO_REFRESH_PATHS.includes(path)) {
    try {
      const newToken = await refreshAccessToken()
      headers.set('Authorization', `Bearer ${newToken}`)
      return request<T>(path, { ...options, headers, _retried: true })
    } catch {
      forceLogout()
      throw new ApiError('UNAUTHORIZED', 'Tu sesión expiró — inicia sesión de nuevo', 401)
    }
  }

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
  patch:  <T>(path: string, body: unknown, opts?: RequestOptions) =>
            request<T>(path, { ...opts, method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string, opts?: RequestOptions) => request<T>(path, { ...opts, method: 'DELETE' }),
}

export { ApiError, refreshAccessToken }
