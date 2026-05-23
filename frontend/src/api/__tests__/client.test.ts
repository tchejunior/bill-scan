import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiFetch } from '../client'

describe('apiFetch', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns parsed JSON on success', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: '1' }),
    } as Response)
    const result = await apiFetch<{ id: string }>('/test')
    expect(result).toEqual({ id: '1' })
  })

  it('throws with detail message on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: () => Promise.resolve({ detail: 'Validation error' }),
    } as Response)
    await expect(apiFetch('/test')).rejects.toThrow('Validation error')
  })

  it('redirects to /login on 401', async () => {
    const originalLocation = window.location
    // @ts-ignore
    delete window.location
    window.location = { href: '' } as Location
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({}),
    } as Response)
    await expect(apiFetch('/test')).rejects.toThrow('Unauthorized')
    expect(window.location.href).toBe('/login')
    // @ts-ignore
    window.location = originalLocation
  })

  it('returns undefined for 204 No Content', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
    } as Response)
    const result = await apiFetch('/test')
    expect(result).toBeUndefined()
  })
})
