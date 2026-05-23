import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Cropper from 'cropperjs'
import 'cropperjs/dist/cropper.min.css'
import { useScanStore } from '@/store/scanStore'
import { receiptsApi } from '@/api/receipts'
import { useQueryClient } from '@tanstack/react-query'

export function CropPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const blob = useScanStore((s) => s.capturedBlob)
  const setBlob = useScanStore((s) => s.setBlob)
  const imgRef = useRef<HTMLImageElement>(null)
  const cropperRef = useRef<Cropper | null>(null)
  const [uploading, setUploading] = useState(false)
  const [imgSrc, setImgSrc] = useState<string | null>(null)
  const [imageLoaded, setImageLoaded] = useState(false)

  useEffect(() => {
    if (!blob) { navigate('/scan'); return }
    setImageLoaded(false)
    const url = URL.createObjectURL(blob)
    setImgSrc(url)
    return () => URL.revokeObjectURL(url)
  }, [blob, navigate])

  useEffect(() => {
    if (!imgSrc || !imgRef.current || !imageLoaded) return
    const cropper = new Cropper(imgRef.current, {
      viewMode: 1,
      autoCropArea: 0.9,
      movable: true,
      zoomable: true,
      rotatable: false,
    })
    cropperRef.current = cropper
    return () => {
      cropper.destroy()
      cropperRef.current = null
    }
  }, [imgSrc, imageLoaded])

  function handleRetake() {
    setBlob(null)
    navigate('/scan')
  }

  async function handleConfirm() {
    if (!cropperRef.current || uploading) return
    setUploading(true)
    try {
      await new Promise<void>((resolve, reject) => {
        cropperRef.current!.getCroppedCanvas({ maxWidth: 1920, maxHeight: 1920 })
          .toBlob(async (croppedBlob) => {
            if (!croppedBlob) { reject(new Error('Failed to crop')); return }
            try {
              await receiptsApi.upload(croppedBlob, 'receipt.jpg')
              queryClient.invalidateQueries({ queryKey: ['receipts'] })
              queryClient.invalidateQueries({ queryKey: ['expenses'] })
              setBlob(null)
              navigate('/')
              resolve()
            } catch (err) {
              reject(err)
            }
          }, 'image/jpeg', 0.9)
      })
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao enviar recibo')
      setUploading(false)
    }
  }

  if (!imgSrc) return null

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: '#000' }}>
      <div className="flex-1 overflow-hidden">
        <img
          ref={imgRef}
          src={imgSrc}
          alt="Recibo"
          onLoad={() => setImageLoaded(true)}
          style={{ maxWidth: '100%', display: 'block' }}
        />
      </div>
      <div
        className="flex gap-4 px-6 py-5"
        style={{ background: 'rgba(0,0,0,0.8)' }}
      >
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
