import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export function FAB() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-20 right-4 z-50 w-14 h-14 rounded-full text-white text-2xl shadow-lg flex items-center justify-center"
        style={{ background: 'var(--accent)' }}
        aria-label="Nova despesa"
      >
        +
      </button>

      {open && (
        <div
          className="fixed bottom-36 right-4 z-50 rounded-xl shadow-xl overflow-hidden"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <button
            className="flex items-center gap-3 px-5 py-3 w-full text-left text-sm hover:opacity-80"
            style={{ color: 'var(--text)' }}
            onClick={() => { setOpen(false); navigate('/scan') }}
          >
            📷 <span>Escanear recibo</span>
          </button>
          <button
            className="flex items-center gap-3 px-5 py-3 w-full text-left text-sm hover:opacity-80"
            style={{ color: 'var(--text)', borderTop: '1px solid var(--border)' }}
            onClick={() => { setOpen(false); navigate('/scan/bulk') }}
          >
            📦 <span>Enviar em lote</span>
          </button>
          <button
            className="flex items-center gap-3 px-5 py-3 w-full text-left text-sm hover:opacity-80"
            style={{ color: 'var(--text)', borderTop: '1px solid var(--border)' }}
            onClick={() => { setOpen(false); navigate('/expense/new') }}
          >
            ✏️ <span>Inserir manualmente</span>
          </button>
        </div>
      )}
    </>
  )
}
