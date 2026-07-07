import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Cropper from 'cropperjs'
import 'cropperjs/dist/cropper.min.css'
import { useScanStore } from '@/store/scanStore'
import { receiptsApi } from '@/api/receipts'
import { expensesApi } from '@/api/expenses'
import { useQueryClient } from '@tanstack/react-query'
import {
  RECEIPT_CROP_CANVAS_OPTIONS,
  RECEIPT_UPLOAD_JPEG_QUALITY,
  RECEIPT_UPLOAD_MIME_TYPE,
} from '@/lib/receiptImage'

export function CropPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const blob = useScanStore((s) => s.capturedBlob)
  const setBlob = useScanStore((s) => s.setBlob)
  const retakeExpenseId = useScanStore((s) => s.retakeExpenseId)
  const retakeOldReceiptId = useScanStore((s) => s.retakeOldReceiptId)
  const clearRetake = useScanStore((s) => s.clearRetake)

  const imgRef = useRef<HTMLImageElement>(null)
  const cropperRef = useRef<Cropper | null>(null)
  const cropperReadyRef = useRef(false)
  const detectedCropRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null)

  const [uploading, setUploading] = useState(false)
  const [imgSrc] = useState(() => (blob ? URL.createObjectURL(blob) : null))
  const [imageLoaded, setImageLoaded] = useState(false)
  const [detecting, setDetecting] = useState(true)

  // Apply detected crop box once both Cropper and detection are ready
  const applyDetectedCrop = useCallback(() => {
    if (!cropperRef.current || !cropperReadyRef.current || !detectedCropRef.current) return
    cropperRef.current.setData(detectedCropRef.current)
  }, [])

  useEffect(() => {
    if (!blob) navigate('/scan')
  }, [blob, navigate])

  useEffect(() => {
    if (!imgSrc) return
    return () => URL.revokeObjectURL(imgSrc)
  }, [imgSrc])

  // Init Cropper.js once image is in the DOM
  useEffect(() => {
    if (!imgSrc || !imgRef.current || !imageLoaded) return
    const cropper = new Cropper(imgRef.current, {
      viewMode: 1,
      autoCropArea: 0.9,
      movable: true,
      zoomable: true,
      rotatable: false,
      ready() {
        cropperReadyRef.current = true
        applyDetectedCrop()
      },
    })
    cropperRef.current = cropper
    return () => {
      cropper.destroy()
      cropperRef.current = null
      cropperReadyRef.current = false
    }
  }, [imgSrc, imageLoaded, applyDetectedCrop])

  // Run edge detection in background as soon as blob arrives
  useEffect(() => {
    if (!blob) return
    let cancelled = false
    receiptsApi.detectEdges(blob)
      .then(({ points }) => {
        if (cancelled || !points || points.length !== 4) return
        const xs = points.map((p) => p.x)
        const ys = points.map((p) => p.y)
        const x = Math.min(...xs)
        const y = Math.min(...ys)
        detectedCropRef.current = {
          x,
          y,
          width: Math.max(...xs) - x,
          height: Math.max(...ys) - y,
        }
        applyDetectedCrop()
      })
      .catch(() => {/* silent — user adjusts manually */})
      .finally(() => { if (!cancelled) setDetecting(false) })
    return () => { cancelled = true }
  }, [blob, applyDetectedCrop])

  function handleRetake() {
    setBlob(null)
    navigate('/scan')
  }

  async function handleConfirm() {
    if (!cropperRef.current || uploading) return
    setUploading(true)
    try {
      await new Promise<void>((resolve, reject) => {
        cropperRef.current!.getCroppedCanvas(RECEIPT_CROP_CANVAS_OPTIONS)
          .toBlob(async (croppedBlob) => {
            if (!croppedBlob || croppedBlob.size === 0) { reject(new Error('Failed to crop image')); return }
            try {
              const receipt = await receiptsApi.upload(croppedBlob, 'receipt.jpg')
              if (retakeExpenseId) {
                const updatedExpense = await expensesApi.update(retakeExpenseId, { receipt_id: receipt.id })
                queryClient.setQueryData(['expense', retakeExpenseId], updatedExpense)
                if (retakeOldReceiptId) await receiptsApi.delete(retakeOldReceiptId).catch(() => null)
                clearRetake()
                queryClient.invalidateQueries({ queryKey: ['receipts'] })
                queryClient.invalidateQueries({ queryKey: ['expenses'] })
                queryClient.invalidateQueries({ queryKey: ['expense', retakeExpenseId] })
                setBlob(null)
                navigate(`/expense/${retakeExpenseId}`)
              } else {
                queryClient.invalidateQueries({ queryKey: ['receipts'] })
                queryClient.invalidateQueries({ queryKey: ['expenses'] })
                setBlob(null)
                navigate('/dashboard')
              }
              resolve()
            } catch (err) { reject(err) }
          }, RECEIPT_UPLOAD_MIME_TYPE, RECEIPT_UPLOAD_JPEG_QUALITY)
      })
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao enviar recibo')
      setUploading(false)
    }
  }

  if (!imgSrc) return null

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: '#000' }}>
      <div className="flex-1 overflow-hidden relative">
        <img
          ref={imgRef}
          src={imgSrc}
          alt="Recibo"
          onLoad={() => setImageLoaded(true)}
          style={{ maxWidth: '100%', display: 'block' }}
        />
        {detecting && (
          <div
            className="absolute bottom-3 left-0 right-0 flex justify-center pointer-events-none"
          >
            <span
              className="text-xs font-medium px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.8)' }}
            >
              Detectando bordas…
            </span>
          </div>
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
          disabled={uploading}
          className="flex-1 py-3 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'var(--accent)' }}
        >
          {uploading ? 'Enviando…' : 'Confirmar'}
        </button>
      </div>
    </div>
  )
}
