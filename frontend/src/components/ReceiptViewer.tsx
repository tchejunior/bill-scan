import { useCallback, useEffect, useRef, useState } from 'react'
import {
  fitTransform,
  zoomAt,
  type ViewTransform,
} from '@/lib/receiptViewerTransform'

const MAX_SCALE = 8

export function ReceiptViewer({ src, className }: { src: string; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const [transform, setTransform] = useState<ViewTransform>({ scale: 1, tx: 0, ty: 0 })
  const fitRef = useRef<ViewTransform>({ scale: 1, tx: 0, ty: 0 })
  const interactedRef = useRef(false)
  const pointers = useRef(new Map<number, { x: number; y: number }>())

  const applyFit = useCallback(() => {
    const container = containerRef.current
    const img = imgRef.current
    if (!container || !img || !img.naturalWidth) return
    const fit = fitTransform(
      container.clientWidth, container.clientHeight,
      img.naturalWidth, img.naturalHeight,
    )
    fitRef.current = fit
    setTransform(fit)
  }, [])

  // Re-fit on container resize until the user starts interacting
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver(() => {
      if (!interactedRef.current) applyFit()
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [applyFit])

  // Wheel zoom needs a non-passive listener to preventDefault page scroll
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    function onWheel(e: WheelEvent) {
      e.preventDefault()
      interactedRef.current = true
      const rect = container!.getBoundingClientRect()
      const factor = Math.exp(-e.deltaY * 0.0015)
      setTransform((t) => zoomAt(
        t, e.clientX - rect.left, e.clientY - rect.top,
        factor, fitRef.current.scale * 0.5, MAX_SCALE,
      ))
    }
    container.addEventListener('wheel', onWheel, { passive: false })
    return () => container.removeEventListener('wheel', onWheel)
  }, [])

  function onPointerDown(e: React.PointerEvent) {
    containerRef.current?.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
  }

  function onPointerMove(e: React.PointerEvent) {
    const prev = pointers.current.get(e.pointerId)
    if (!prev) return
    interactedRef.current = true
    const rect = containerRef.current!.getBoundingClientRect()

    if (pointers.current.size === 2) {
      const other = [...pointers.current.entries()].find(([id]) => id !== e.pointerId)?.[1]
      if (other) {
        const prevDist = Math.hypot(prev.x - other.x, prev.y - other.y)
        const newDist = Math.hypot(e.clientX - other.x, e.clientY - other.y)
        if (prevDist > 0) {
          const midX = (e.clientX + other.x) / 2 - rect.left
          const midY = (e.clientY + other.y) / 2 - rect.top
          setTransform((t) => zoomAt(
            t, midX, midY, newDist / prevDist,
            fitRef.current.scale * 0.5, MAX_SCALE,
          ))
        }
      }
    } else if (pointers.current.size === 1) {
      setTransform((t) => ({ ...t, tx: t.tx + e.clientX - prev.x, ty: t.ty + e.clientY - prev.y }))
    }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
  }

  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId)
  }

  function reset() {
    interactedRef.current = false
    applyFit()
  }

  function buttonZoom(factor: number) {
    const container = containerRef.current
    if (!container) return
    interactedRef.current = true
    setTransform((t) => zoomAt(
      t, container.clientWidth / 2, container.clientHeight / 2,
      factor, fitRef.current.scale * 0.5, MAX_SCALE,
    ))
  }

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden select-none ${className ?? ''}`}
      style={{ touchAction: 'none', background: 'rgba(0,0,0,0.35)', cursor: 'grab' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={reset}
    >
      <img
        ref={imgRef}
        src={src}
        alt="Recibo"
        draggable={false}
        onLoad={applyFit}
        style={{
          transform: `translate(${transform.tx}px, ${transform.ty}px) scale(${transform.scale})`,
          transformOrigin: '0 0',
          maxWidth: 'none',
          display: 'block',
        }}
      />
      <div className="absolute bottom-3 right-3 flex gap-1.5">
        <button
          type="button"
          aria-label="Diminuir zoom"
          onClick={() => buttonZoom(0.8)}
          onPointerDown={(e) => e.stopPropagation()}
          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-lg font-bold"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
        >
          -
        </button>
        <button
          type="button"
          aria-label="Aumentar zoom"
          onClick={() => buttonZoom(1.25)}
          onPointerDown={(e) => e.stopPropagation()}
          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-lg font-bold"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
        >
          +
        </button>
        <button
          type="button"
          aria-label="Ajustar à tela"
          onClick={reset}
          onPointerDown={(e) => e.stopPropagation()}
          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-lg font-bold"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
        >
          ⤢
        </button>
      </div>
    </div>
  )
}
