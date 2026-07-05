import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiFetch } from '../client'
import { queryClient } from '@/lib/queryClient'

vi.mock('@/lib/queryClient', () => ({
  queryClient: { setQueryData: vi.fn() },
}))

function jsonResponse(status: number, body: unknown = {}): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response
}

describe('apiFetch', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.mocked(queryClient.setQueryData).mockClear()
  })

  it('returns parsed JSON on success', async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse(200, { id: '1' }))
    const result = await apiFetch<{ id: string }>('/test')
    expect(result).toEqual({ id: '1' })
  })

  it('throws with detail message on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse(422, { detail: 'Validation error' }))
    await expect(apiFetch('/test')).rejects.toThrow('Validation error')
  })

  it('returns undefined for 204 No Content', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 204 } as Response)
    const result = await apiFetch('/test')
    expect(result).toBeUndefined()
  })

  it('refreshes and retries the original request on 401', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401)) // original request
      .mockResolvedValueOnce(jsonResponse(200)) // POST /auth/refresh
      .mockResolvedValueOnce(jsonResponse(200, { id: '1' })) // retry
    const result = await apiFetch<{ id: string }>('/test')
    expect(result).toEqual({ id: '1' })
    expect(global.fetch).toHaveBeenCalledTimes(3)
    expect(vi.mocked(global.fetch).mock.calls[1][0]).toBe('/api/auth/refresh')
    expect(queryClient.setQueryData).not.toHaveBeenCalled()
  })

  it('clears auth state when refresh fails', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401)) // original request
      .mockResolvedValueOnce(jsonResponse(401)) // refresh fails
    await expect(apiFetch('/test')).rejects.toThrow('Unauthorized')
    expect(queryClient.setQueryData).toHaveBeenCalledWith(['auth/me'], null)
  })

  it('clears auth state when the retry also returns 401', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401)) // original request
      .mockResolvedValueOnce(jsonResponse(200)) // refresh succeeds
      .mockResolvedValueOnce(jsonResponse(401)) // retry still unauthorized
    await expect(apiFetch('/test')).rejects.toThrow('Unauthorized')
    expect(global.fetch).toHaveBeenCalledTimes(3)
    expect(queryClient.setQueryData).toHaveBeenCalledWith(['auth/me'], null)
  })

  it('does not attempt refresh for login 401', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(jsonResponse(401))
    await expect(apiFetch('/auth/login', { method: 'POST' })).rejects.toThrow('Unauthorized')
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })
})
