import { describe, it, expect } from 'vitest'
import { zoomAt, fitTransform } from '../ReceiptViewer'

describe('fitTransform', () => {
  it('fits a tall image into a container and centers it horizontally', () => {
    const t = fitTransform(800, 600, 400, 1200)
    expect(t.scale).toBe(0.5) // 600/1200
    expect(t.tx).toBe(300)    // (800 - 400*0.5) / 2
    expect(t.ty).toBe(0)
  })

  it('fits a wide image and centers it vertically', () => {
    const t = fitTransform(800, 600, 1600, 600)
    expect(t.scale).toBe(0.5)
    expect(t.tx).toBe(0)
    expect(t.ty).toBe(150)
  })
})

describe('zoomAt', () => {
  const base = { scale: 1, tx: 0, ty: 0 }

  it('keeps the anchor point visually fixed while zooming', () => {
    // Image point under container point (100, 50) before zoom:
    // p = (cx - tx) / scale = (100, 50)
    const t = zoomAt(base, 100, 50, 2, 0.1, 8)
    expect(t.scale).toBe(2)
    // Same image point after: tx + p*scale should equal cx again
    expect(t.tx + 100 * t.scale).toBeCloseTo(100)
    expect(t.ty + 50 * t.scale).toBeCloseTo(50)
  })

  it('clamps to max scale', () => {
    const t = zoomAt({ scale: 6, tx: 0, ty: 0 }, 0, 0, 3, 0.1, 8)
    expect(t.scale).toBe(8)
  })

  it('clamps to min scale', () => {
    const t = zoomAt({ scale: 0.4, tx: 0, ty: 0 }, 0, 0, 0.1, 0.25, 8)
    expect(t.scale).toBe(0.25)
  })

  it('zooming in then out by the inverse factor restores the transform', () => {
    const zoomedIn = zoomAt(base, 200, 150, 2, 0.1, 8)
    const back = zoomAt(zoomedIn, 200, 150, 0.5, 0.1, 8)
    expect(back.scale).toBeCloseTo(1)
    expect(back.tx).toBeCloseTo(0)
    expect(back.ty).toBeCloseTo(0)
  })
})
