import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'

const tabs = [
  { to: '/dashboard', icon: '🏠', label: 'Início' },
  { to: '/reports', icon: '📊', label: 'Relatório' },
  { to: '/settings', icon: '⚙️', label: 'Config' },
]

export function SideNav() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <nav
      className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-56 border-r z-30"
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
    >
      <div className="px-5 pt-6 pb-4">
        <span className="text-sm font-bold tracking-tight" style={{ color: 'var(--text)' }}>Recibo42</span>
      </div>

      <div className="flex flex-col gap-1 px-3 flex-1">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/dashboard'}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-opacity"
            style={({ isActive }) => ({
              background: isActive ? 'var(--accent)' : 'transparent',
              color: isActive ? '#fff' : 'var(--text-muted)',
            })}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </NavLink>
        ))}
      </div>

      <div className="px-3 py-4 relative">
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div
              className="absolute bottom-full left-3 right-3 mb-2 rounded-xl shadow-xl overflow-hidden z-50"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <button
                className="flex items-center gap-3 px-4 py-3 w-full text-left text-sm hover:opacity-80"
                style={{ color: 'var(--text)' }}
                onClick={() => { setOpen(false); navigate('/scan') }}
              >
                📷 <span>Escanear recibo</span>
              </button>
              <button
                className="flex items-center gap-3 px-4 py-3 w-full text-left text-sm hover:opacity-80"
                style={{ color: 'var(--text)', borderTop: '1px solid var(--border)' }}
                onClick={() => { setOpen(false); navigate('/scan/bulk') }}
              >
                📦 <span>Enviar em lote</span>
              </button>
              <button
                className="flex items-center gap-3 px-4 py-3 w-full text-left text-sm hover:opacity-80"
                style={{ color: 'var(--text)', borderTop: '1px solid var(--border)' }}
                onClick={() => { setOpen(false); navigate('/expense/new') }}
              >
                ✏️ <span>Inserir manualmente</span>
              </button>
            </div>
          </>
        )}

        <button
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold text-white"
          style={{ background: 'var(--accent)' }}
        >
          <span className="text-lg leading-none">+</span>
          <span>Nova despesa</span>
        </button>
      </div>
    </nav>
  )
}
