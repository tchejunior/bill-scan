import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Cropper from 'cropperjs'
import 'cropperjs/dist/cropper.min.css'
import { receiptsApi } from '@/api/receipts'
import type { DetectedPoint } from '@/api/receipts'

type Phase = 'select' | 'review' | 'uploading' | 'done'
type UploadStatus = 'queued' | 'uploading' | 'done' | 'error'
type CropRect = { x: number; y: number; width: number; height: number }

interface Entry {
  id: string
  file: File
  previewUrl: string
  detecting: boolean
  detectedCrop: CropRect | null
  savedCrop: CropRect | null
  uploadStatus: UploadStatus
}

function pointsToRect(points: DetectedPoint[]): CropRect {
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const x = Math.min(...xs), y = Math.min(...ys)
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y }
}

function cropFromRect(file: File, crop: CropRect): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const { x, y, width, height } = crop
      const maxDim = 1920
      const scale = Math.min(maxDim / width, maxDim / height, 1)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(width * scale)
      canvas.height = Math.round(height * scale)
      canvas.getContext('2d')!.drawImage(img, x, y, width, height, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('crop failed'))),
        'image/jpeg', 0.9,
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('load failed')) }
    img.src = url
  })
}

function compressFull(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const maxDim = 1920
      let { naturalWidth: w, naturalHeight: h } = img
      if (w > maxDim || h > maxDim) {
        const r = Math.min(maxDim / w, maxDim / h)
        w = Math.round(w * r); h = Math.round(h * r)
      }
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('compress failed'))),
        'image/jpeg', 0.9,
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('load failed')) }
    img.src = url
  })
}

export function BulkUploadPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [phase, setPhase] = useState<Phase>('select')
  const [entries, setEntries] = useState<Entry[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [imgLoaded, setImgLoaded] = useState(false)

  const cropperRef = useRef<Cropper | null>(null)
  const cropperReadyRef = useRef(false)
  const cropAdjustedRef = useRef(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)

  // ─── SELECT ──────────────────────────────────────────────────────────────

  function addFiles(files: FileList | null) {
    if (!files) return
    const next: Entry[] = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      detecting: false,
      detectedCrop: null,
      savedCrop: null,
      uploadStatus: 'queued',
    }))
    setEntries((prev) => [...prev, ...next])
  }

  function removeEntry(id: string) {
    setEntries((prev) => {
      const e = prev.find((x) => x.id === id)
      if (e) URL.revokeObjectURL(e.previewUrl)
      return prev.filter((x) => x.id !== id)
    })
  }

  function enterReview() {
    if (entries.length === 0) return
    setEntries((prev) => prev.map((e) => ({ ...e, detecting: false, detectedCrop: null, savedCrop: null })))
    setPhase('review')
    setCurrentIndex(0)
    setImgLoaded(false)
    cropAdjustedRef.current = false
  }

  // ─── REVIEW ──────────────────────────────────────────────────────────────

  function goTo(newIndex: number) {
    if (newIndex < 0 || newIndex >= entries.length) return

    if (cropperRef.current) {
      const d = cropperRef.current.getData(true)
      const savedCrop: CropRect = { x: d.x, y: d.y, width: d.width, height: d.height }
      setEntries((prev) => prev.map((e, i) => i === currentIndex ? { ...e, savedCrop } : e))
      cropperRef.current.destroy()
      cropperRef.current = null
      cropperReadyRef.current = false
    }
    cropAdjustedRef.current = false
    setImgLoaded(false)
    setCurrentIndex(newIndex)
  }

  // Init / destroy Cropper.js whenever the current image loads; also fire edge detection for this image
  useEffect(() => {
    if (phase !== 'review' || !imgLoaded || !imgRef.current) return
    const entry = entries[currentIndex]
    if (!entry) return
    const initCrop = entry.savedCrop ?? entry.detectedCrop ?? null
    const idx = currentIndex
    const file = entry.file

    const cropper = new Cropper(imgRef.current, {
      viewMode: 1,
      autoCropArea: 0.9,
      movable: true,
      zoomable: true,
      rotatable: false,
      cropend() { cropAdjustedRef.current = true },
      ready() {
        cropperReadyRef.current = true
        if (initCrop) {
          cropper.setData(initCrop)
          cropAdjustedRef.current = true
        }
      },
    })
    cropperRef.current = cropper

    // Fire detection for this image if not yet attempted
    if (!entry.detecting && !entry.detectedCrop) {
      setEntries((prev) => prev.map((e, i) => i === idx ? { ...e, detecting: true } : e))
      receiptsApi.detectEdges(file)
        .then(({ points }) => {
          const crop = points && points.length === 4 ? pointsToRect(points) : null
          setEntries((prev) => prev.map((e, i) => i === idx ? { ...e, detecting: false, detectedCrop: crop } : e))
        })
        .catch(() => {
          setEntries((prev) => prev.map((e, i) => i === idx ? { ...e, detecting: false } : e))
        })
    }

    return () => {
      cropper.destroy()
      cropperRef.current = null
      cropperReadyRef.current = false
    }
    // intentionally omit entries — only re-init when image/phase changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, currentIndex, imgLoaded])

  // Apply detection result for the current image once ready, if user hasn't touched crop yet
  useEffect(() => {
    if (phase !== 'review') return
    const entry = entries[currentIndex]
    if (!entry || entry.detecting || !entry.detectedCrop) return
    if (cropAdjustedRef.current) return
    if (!cropperReadyRef.current || !cropperRef.current) return
    cropperRef.current.setData(entry.detectedCrop)
    cropAdjustedRef.current = true
  }, [entries, currentIndex, phase])

  // Swipe navigation
  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }
  function onTouchEnd(e: React.TouchEvent) {
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    if (Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      dx < 0 ? goTo(currentIndex + 1) : goTo(currentIndex - 1)
    }
  }

  // ─── UPLOAD ──────────────────────────────────────────────────────────────

  async function startUpload() {
    // Capture current crop before destroying cropper
    let lastCrop: CropRect | null = null
    if (cropperRef.current) {
      const d = cropperRef.current.getData(true)
      lastCrop = { x: d.x, y: d.y, width: d.width, height: d.height }
      cropperRef.current.destroy()
      cropperRef.current = null
      cropperReadyRef.current = false
    }

    // Build final snapshot with the last image's crop applied
    const finalEntries = entries.map((e, i) =>
      i === currentIndex && lastCrop ? { ...e, savedCrop: lastCrop } : e,
    )

    setPhase('uploading')
    setEntries(finalEntries.map((e) => ({ ...e, uploadStatus: 'queued' })))

    for (const entry of finalEntries) {
      setEntries((prev) => prev.map((e) =>
        e.id === entry.id ? { ...e, uploadStatus: 'uploading' } : e,
      ))
      try {
        const crop = entry.savedCrop ?? entry.detectedCrop
        const blob = crop && crop.width > 0 && crop.height > 0
          ? await cropFromRect(entry.file, crop)
          : await compressFull(entry.file)
        await receiptsApi.upload(blob, 'receipt.jpg')
        setEntries((prev) => prev.map((e) =>
          e.id === entry.id ? { ...e, uploadStatus: 'done' } : e,
        ))
      } catch {
        setEntries((prev) => prev.map((e) =>
          e.id === entry.id ? { ...e, uploadStatus: 'error' } : e,
        ))
      }
    }
    setPhase('done')
  }

  // ─── RENDER ──────────────────────────────────────────────────────────────

  const sentCount = entries.filter((e) => e.uploadStatus === 'done').length
  const errorCount = entries.filter((e) => e.uploadStatus === 'error').length
  const progressCount = sentCount + errorCount
  const currentEntry = entries[currentIndex]

  // REVIEW phase — full-screen Cropper.js
  if (phase === 'review' && currentEntry) {
    return (
      <div
        className="fixed inset-0 flex flex-col"
        style={{ background: '#000' }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <span className="text-white text-sm font-medium">
            {currentIndex + 1} / {entries.length}
          </span>
          <div className="flex items-center gap-2">
            {currentEntry.detecting && (
              <span
                className="text-xs font-medium px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)' }}
              >
                Detectando bordas…
              </span>
            )}
          </div>
          <button
            onClick={() => { setPhase('select'); setImgLoaded(false); if (cropperRef.current) { cropperRef.current.destroy(); cropperRef.current = null } }}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm"
            style={{ background: 'rgba(255,255,255,0.15)' }}
          >
            ✕
          </button>
        </div>

        {/* Cropper area */}
        <div className="flex-1 overflow-hidden">
          <img
            ref={imgRef}
            src={currentEntry.previewUrl}
            alt="Recibo"
            onLoad={() => setImgLoaded(true)}
            style={{ maxWidth: '100%', display: 'block' }}
          />
        </div>

        {/* Navigation + action */}
        <div className="flex-shrink-0 px-4 py-4 space-y-3" style={{ background: 'rgba(0,0,0,0.8)' }}>
          <div className="flex gap-3">
            <button
              onClick={() => goTo(currentIndex - 1)}
              disabled={currentIndex === 0}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'rgba(255,255,255,0.1)', opacity: currentIndex === 0 ? 0.3 : 1 }}
            >
              ← Anterior
            </button>
            <button
              onClick={() => goTo(currentIndex + 1)}
              disabled={currentIndex === entries.length - 1}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'rgba(255,255,255,0.1)', opacity: currentIndex === entries.length - 1 ? 0.3 : 1 }}
            >
              Próximo →
            </button>
          </div>
          <button
            onClick={startUpload}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'var(--accent)' }}
          >
            Enviar {entries.length} recibo{entries.length !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    )
  }

  // SELECT / UPLOADING / DONE phases — grid view
  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: 'var(--bg)' }}>
      <div
        className="flex items-center gap-3 px-4 pt-6 pb-4 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <button onClick={() => navigate(-1)} style={{ color: 'var(--text-muted)' }}>←</button>
        <h1 className="text-lg font-bold" style={{ color: 'var(--text)' }}>Enviar em lote</h1>
        {entries.length > 0 && phase === 'select' && (
          <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>
            {entries.length} imagem{entries.length !== 1 ? 'ns' : ''}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {entries.length === 0 ? (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-56 rounded-2xl flex flex-col items-center justify-center gap-3 text-sm font-medium"
            style={{ border: '2px dashed var(--border)', color: 'var(--text-muted)', background: 'var(--bg-card)' }}
          >
            <span className="text-5xl">📁</span>
            Toque para selecionar imagens
            <span className="text-xs opacity-60">Múltiplas imagens aceitas</span>
          </button>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="relative rounded-xl overflow-hidden"
                style={{ aspectRatio: '1', background: 'var(--bg-card)' }}
              >
                <img src={entry.previewUrl} alt="" className="w-full h-full object-cover" />

                {entry.uploadStatus === 'uploading' && (
                  <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.55)' }}>
                    <span className="text-2xl">⏳</span>
                  </div>
                )}
                {entry.uploadStatus === 'done' && (
                  <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(52,199,89,0.35)' }}>
                    <span className="text-3xl font-bold text-white">✓</span>
                  </div>
                )}
                {entry.uploadStatus === 'error' && (
                  <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(233,69,96,0.45)' }}>
                    <span className="text-2xl">✕</span>
                  </div>
                )}
                {phase === 'select' && (
                  <button
                    onClick={() => removeEntry(entry.id)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: 'rgba(0,0,0,0.65)', color: '#fff' }}
                    aria-label="Remover"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}

            {phase === 'select' && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="rounded-xl flex items-center justify-center text-3xl"
                style={{ aspectRatio: '1', border: '2px dashed var(--border)', color: 'var(--text-muted)', background: 'var(--bg-card)' }}
                aria-label="Adicionar mais"
              >
                +
              </button>
            )}
          </div>
        )}
      </div>

      <div
        className="px-4 py-5 flex-shrink-0"
        style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-card)' }}
      >
        {phase === 'done' ? (
          <div className="space-y-3">
            <p className="text-sm text-center" style={{ color: 'var(--text-muted)' }}>
              {sentCount} enviado{sentCount !== 1 ? 's' : ''}
              {errorCount > 0 && ` · ${errorCount} com erro`}
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'var(--accent)' }}
            >
              Ver no painel
            </button>
          </div>
        ) : phase === 'uploading' ? (
          <button
            disabled
            className="w-full py-3 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'var(--accent)', opacity: 0.75 }}
          >
            Enviando… {progressCount}/{entries.length}
          </button>
        ) : (
          <button
            onClick={entries.length === 0 ? () => fileInputRef.current?.click() : enterReview}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'var(--accent)' }}
          >
            {entries.length === 0
              ? 'Selecionar imagens'
              : `Revisar e enviar ${entries.length} recibo${entries.length !== 1 ? 's' : ''}`}
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => { addFiles(e.target.files); e.target.value = '' }}
      />
    </div>
  )
}
