import { queryClient } from '@/lib/queryClient'

const BASE_URL = '/api'

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
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
