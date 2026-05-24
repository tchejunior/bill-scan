import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCamera } from '@/hooks/useCamera'
import { useScanStore } from '@/store/scanStore'

export function ScanPage() {
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const { start, stop, capture, toggleFlash, flashOn, error } = useCamera(videoRef)
  const setBlob = useScanStore((s) => s.setBlob)
  const [capturing, setCapturing] = useState(false)

  useEffect(() => {
    start()
    return () => stop()
  }, [start, stop])

  async function handleCapture() {
    if (capturing) return
    setCapturing(true)
    const blob = await capture()
    if (blob) {
      setBlob(blob)
      navigate('/scan/crop')
    }
    setCapturing(false)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBlob(file)
    navigate('/scan/crop')
  }

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: '#000' }}>
      {error ? (
        <div className="flex-1 flex items-center justify-center p-8 text-center text-white">
          <div>
            <div className="text-4xl mb-4">📷</div>
            <p className="text-sm opacity-80">{error}</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="mt-6 px-6 py-2 rounded-full text-sm"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              Voltar
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 relative overflow-hidden">
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              playsInline
              muted
            />
            <button
              onClick={() => navigate('/dashboard')}
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full flex items-center justify-center text-white text-lg font-bold"
              style={{ background: 'rgba(0,0,0,0.5)' }}
              aria-label="Fechar"
            >
              ✕
            </button>
            {/* Guide overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="w-72 h-44 relative"
                style={{ border: '1.5px solid rgba(233,69,96,0.8)', borderRadius: 8 }}
              >
                <div style={{ position: 'absolute', top: -2, left: -2, width: 16, height: 16, borderTop: '2px solid #e94560', borderLeft: '2px solid #e94560', borderRadius: '3px 0 0 0' }} />
                <div style={{ position: 'absolute', top: -2, right: -2, width: 16, height: 16, borderTop: '2px solid #e94560', borderRight: '2px solid #e94560', borderRadius: '0 3px 0 0' }} />
                <div style={{ position: 'absolute', bottom: -2, left: -2, width: 16, height: 16, borderBottom: '2px solid #e94560', borderLeft: '2px solid #e94560', borderRadius: '0 0 0 3px' }} />
                <div style={{ position: 'absolute', bottom: -2, right: -2, width: 16, height: 16, borderBottom: '2px solid #e94560', borderRight: '2px solid #e94560', borderRadius: '0 0 3px 0' }} />
              </div>
            </div>
            <p className="absolute bottom-4 left-0 right-0 text-center text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Encaixe o recibo no guia
            </p>
          </div>

          <div
            className="flex items-center justify-around px-8 py-6"
            style={{ background: 'rgba(0,0,0,0.7)' }}
          >
            <button
              onClick={toggleFlash}
              className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
              style={{ background: flashOn ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)' }}
              aria-label="Flash"
            >
              ⚡
            </button>

            <button
              onClick={handleCapture}
              disabled={capturing}
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl"
              style={{
                background: 'var(--accent)',
                boxShadow: '0 0 0 4px rgba(233,69,96,0.3)',
              }}
              aria-label="Capturar"
            >
              📷
            </button>

            <button
              onClick={() => fileRef.current?.click()}
              className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
              style={{ background: 'rgba(255,255,255,0.1)' }}
              aria-label="Galeria"
            >
              🖼️
            </button>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </>
      )}
    </div>
  )
}
