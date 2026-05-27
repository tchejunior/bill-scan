import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { receiptsApi } from '@/api/receipts'

interface FileEntry {
  id: string
  file: File
  previewUrl: string
  status: 'queued' | 'uploading' | 'done' | 'error'
}

function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const maxDim = 1920
      let { width, height } = img
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('compress failed'))),
        'image/jpeg',
        0.9,
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('load failed')) }
    img.src = url
  })
}

export function BulkUploadPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [uploading, setUploading] = useState(false)
  const [done, setDone] = useState(false)

  function addFiles(files: FileList | null) {
    if (!files) return
    const next: FileEntry[] = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      status: 'queued',
    }))
    setEntries((prev) => [...prev, ...next])
  }

  function removeEntry(id: string) {
    setEntries((prev) => {
      const entry = prev.find((e) => e.id === id)
      if (entry) URL.revokeObjectURL(entry.previewUrl)
      return prev.filter((e) => e.id !== id)
    })
  }

  function setStatus(id: string, status: FileEntry['status']) {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, status } : e)))
  }

  async function handleUpload() {
    if (uploading || entries.length === 0) return
    setUploading(true)
    for (const entry of entries) {
      setStatus(entry.id, 'uploading')
      try {
        const blob = await compressImage(entry.file)
        await receiptsApi.upload(blob, 'receipt.jpg')
        setStatus(entry.id, 'done')
      } catch {
        setStatus(entry.id, 'error')
      }
    }
    setUploading(false)
    setDone(true)
  }

  const sentCount = entries.filter((e) => e.status === 'done').length
  const errorCount = entries.filter((e) => e.status === 'error').length
  const progressCount = sentCount + errorCount

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: 'var(--bg)' }}>
      <div
        className="flex items-center gap-3 px-4 pt-6 pb-4 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <button onClick={() => navigate(-1)} style={{ color: 'var(--text-muted)' }}>←</button>
        <h1 className="text-lg font-bold" style={{ color: 'var(--text)' }}>Enviar em lote</h1>
        {entries.length > 0 && !uploading && !done && (
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

                {entry.status === 'uploading' && (
                  <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.55)' }}>
                    <span className="text-2xl">⏳</span>
                  </div>
                )}
                {entry.status === 'done' && (
                  <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(52,199,89,0.35)' }}>
                    <span className="text-3xl font-bold text-white">✓</span>
                  </div>
                )}
                {entry.status === 'error' && (
                  <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(233,69,96,0.45)' }}>
                    <span className="text-2xl">✕</span>
                  </div>
                )}
                {entry.status === 'queued' && (
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

            {!uploading && !done && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="rounded-xl flex items-center justify-center text-3xl"
                style={{
                  aspectRatio: '1',
                  border: '2px dashed var(--border)',
                  color: 'var(--text-muted)',
                  background: 'var(--bg-card)',
                }}
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
        {done ? (
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
        ) : (
          <button
            onClick={entries.length === 0 ? () => fileInputRef.current?.click() : handleUpload}
            disabled={uploading}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'var(--accent)', opacity: uploading ? 0.75 : 1 }}
          >
            {uploading
              ? `Enviando… ${progressCount}/${entries.length}`
              : entries.length === 0
                ? 'Selecionar imagens'
                : `Enviar ${entries.length} recibo${entries.length !== 1 ? 's' : ''}`}
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
