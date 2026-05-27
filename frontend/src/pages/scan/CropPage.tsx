import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useScanStore } from '@/store/scanStore'
import { receiptsApi } from '@/api/receipts'
import { expensesApi } from '@/api/expenses'
import { useQueryClient } from '@tanstack/react-query'

function autoCrop(blob: Blob): Promise<{ cropped: Blob; previewUrl: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const ratio = 0.9
      const sw = img.naturalWidth * ratio
      const sh = img.naturalHeight * ratio
      const sx = (img.naturalWidth - sw) / 2
      const sy = (img.naturalHeight - sh) / 2
      const maxDim = 1920
      const scale = Math.min(maxDim / sw, maxDim / sh, 1)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(sw * scale)
      canvas.height = Math.round(sh * scale)
      canvas.getContext('2d')!.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        (b) => {
          if (!b) { reject(new Error('crop failed')); return }
          resolve({ cropped: b, previewUrl: URL.createObjectURL(b) })
        },
        'image/jpeg',
        0.9,
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('load failed')) }
    img.src = url
  })
}

export function CropPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const blob = useScanStore((s) => s.capturedBlob)
  const setBlob = useScanStore((s) => s.setBlob)
  const retakeExpenseId = useScanStore((s) => s.retakeExpenseId)
  const retakeOldReceiptId = useScanStore((s) => s.retakeOldReceiptId)
  const clearRetake = useScanStore((s) => s.clearRetake)

  const croppedRef = useRef<Blob | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [processing, setProcessing] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!blob) { navigate('/scan'); return }
    let cancelled = false
    autoCrop(blob)
      .then(({ cropped, previewUrl: url }) => {
        if (cancelled) { URL.revokeObjectURL(url); return }
        croppedRef.current = cropped
        setPreviewUrl(url)
        setProcessing(false)
      })
      .catch(() => {
        if (!cancelled) setError('Não foi possível processar a imagem')
      })
    return () => { cancelled = true }
  }, [blob, navigate])

  useEffect(() => {
    const url = previewUrl
    return () => { if (url) URL.revokeObjectURL(url) }
  }, [previewUrl])

  function handleRetake() {
    setBlob(null)
    navigate('/scan')
  }

  async function handleConfirm() {
    const cropped = croppedRef.current
    if (!cropped || uploading) return
    setUploading(true)
    try {
      const receipt = await receiptsApi.upload(cropped, 'receipt.jpg')
      if (retakeExpenseId) {
        await expensesApi.update(retakeExpenseId, { receipt_id: receipt.id })
        if (retakeOldReceiptId) await receiptsApi.delete(retakeOldReceiptId).catch(() => null)
        clearRetake()
        queryClient.invalidateQueries({ queryKey: ['receipts'] })
        queryClient.invalidateQueries({ queryKey: ['expenses'] })
        setBlob(null)
        navigate(`/expense/${retakeExpenseId}`)
      } else {
        queryClient.invalidateQueries({ queryKey: ['receipts'] })
        queryClient.invalidateQueries({ queryKey: ['expenses'] })
        setBlob(null)
        navigate('/dashboard')
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao enviar recibo')
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: '#000' }}>
      <div className="flex-1 relative overflow-hidden flex items-center justify-center">
        {processing && !error && (
          <span className="text-white text-sm" style={{ opacity: 0.6 }}>Processando…</span>
        )}
        {error && (
          <p className="text-red-400 text-sm text-center px-8">{error}</p>
        )}
        {previewUrl && (
          <img
            src={previewUrl}
            alt="Recibo"
            className="w-full h-full object-contain"
          />
        )}
      </div>

      <div className="flex gap-4 px-6 py-5" style={{ background: 'rgba(0,0,0,0.8)' }}>
        <button
          onClick={handleRetake}
          className="flex-1 py-3 rounded-xl text-sm font-semibold"
          style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}
        >
          Refazer
        </button>
        <button
          onClick={handleConfirm}
          disabled={processing || uploading || !!error}
          className="flex-1 py-3 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'var(--accent)', opacity: processing || uploading ? 0.6 : 1 }}
        >
          {uploading ? 'Enviando…' : 'Confirmar'}
        </button>
      </div>
    </div>
  )
}
