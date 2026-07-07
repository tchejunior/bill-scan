import { useRef, useState, useCallback } from 'react'
import {
  RECEIPT_CAMERA_VIDEO_CONSTRAINTS,
  RECEIPT_UPLOAD_JPEG_QUALITY,
  RECEIPT_UPLOAD_MIME_TYPE,
} from '@/lib/receiptImage'

export function useCamera(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const streamRef = useRef<MediaStream | null>(null)
  const [flashOn, setFlashOn] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: RECEIPT_CAMERA_VIDEO_CONSTRAINTS,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
    } catch {
      setError('Câmera não disponível. Verifique as permissões.')
    }
  }, [videoRef])

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  const capture = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!videoRef.current) { resolve(null); return }
      const video = videoRef.current
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      canvas.getContext('2d')?.drawImage(video, 0, 0)
      canvas.toBlob(resolve, RECEIPT_UPLOAD_MIME_TYPE, RECEIPT_UPLOAD_JPEG_QUALITY)
    })
  }, [videoRef])

  const toggleFlash = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track) return
    try {
      const next = !flashOn
      await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] })
      setFlashOn(next)
    } catch {
      // Torch not supported on this device — silent fail
    }
  }, [flashOn])

  return { start, stop, capture, toggleFlash, flashOn, error }
}
