import { queryClient } from '@/lib/queryClient'

const BASE_URL = '/api'

// Endpoints where a 401 is a definitive answer, not an expired access token.
const NO_REFRESH_PATHS = ['/auth/login', '/auth/refresh', '/auth/logout', '/auth/change-password']

let refreshPromise: Promise<boolean> | null = null

function tryRefresh(): Promise<boolean> {
  refreshPromise ??= fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  })
    .then((r) => r.ok)
    .catch(() => false)
    .finally(() => {
      refreshPromise = null
    })
  return refreshPromise
}

export async function apiFetch<T>(path: string, init?: RequestInit, isRetry = false): Promise<T> {
  const isFormData = init?.body instanceof FormData
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(!isFormData && { 'Content-Type': 'application/json' }),
      ...init?.headers,
    },
  })

  if (res.status === 401) {
    if (!isRetry && !NO_REFRESH_PATHS.includes(path) && (await tryRefresh())) {
      return apiFetch(path, init, true)
    }
    queryClient.setQueryData(['auth/me'], null)
    throw new Error('Unauthorized')
  }

  if (res.status === 204) return undefined as T

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const detail = body.detail
    const message = Array.isArray(detail)
      ? detail.map((e: { msg?: string }) => e.msg).filter(Boolean).join('; ')
      : String(detail ?? `HTTP ${res.status}`)
    throw new Error(message)
  }

  return res.json()
}
