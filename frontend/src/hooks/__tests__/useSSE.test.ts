import { describe, it, expect } from 'vitest'

describe('useSSE', () => {
  it('can be imported without throwing', async () => {
    const mod = await import('../useSSE')
    expect(typeof mod.useSSE).toBe('function')
  })
})
