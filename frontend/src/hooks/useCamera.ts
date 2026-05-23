import { useRef, useState, useCallback } from 'react'

export function useCamera(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const streamRef = useRef<MediaStream | null>(null)
  const [flashOn, setFlashOn] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 } },
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
      canvas.toBlob(resolve, 'image/jpeg', 0.9)
    })
  }, [videoRef])

  const toggleFlash = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track) return
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ic = new (window as any).ImageCapture(track)
      await ic.setPhotoSettings({ fillLightMode: flashOn ? 'off' : 'flash' })
      setFlashOn((v) => !v)
    } catch {
      // Flash not supported — silent fail
    }
  }, [flashOn])

  return { start, stop, capture, toggleFlash, flashOn, error }
}
