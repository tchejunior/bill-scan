import { useState, type FormEvent } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { apiFetch } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function SettingsPage() {
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)
  const [changingPw, setChangingPw] = useState(false)

  async function handlePasswordChange(e: FormEvent) {
    e.preventDefault()
    setPwError('')
    setPwSuccess(false)
    if (newPw !== confirmPw) { setPwError('As senhas não coincidem'); return }
    if (newPw.length < 8) { setPwError('A nova senha deve ter pelo menos 8 caracteres'); return }
    setChangingPw(true)
    try {
      await apiFetch('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ current_password: currentPw, new_password: newPw }),
      })
      setPwSuccess(true)
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
    } catch (err) {
      setPwError(err instanceof Error ? err.message : 'Erro ao alterar senha')
    } finally {
      setChangingPw(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
        <h1 className="text-lg font-bold mb-6" style={{ color: 'var(--text)' }}>Configurações</h1>

        {/* Account section */}
        <section className="mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
            Conta
          </h2>
          <div
            className="rounded-xl px-4 py-3 mb-4"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>E-mail</p>
            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{user?.email}</p>
          </div>

          <div
            className="rounded-xl px-4 py-4"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <p className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>Alterar senha</p>
            <form onSubmit={handlePasswordChange} className="space-y-3">
              <div className="space-y-1">
                <Label>Senha atual</Label>
                <Input
                  type="password"
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              <div className="space-y-1">
                <Label>Nova senha</Label>
                <Input
                  type="password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-1">
                <Label>Confirmar nova senha</Label>
                <Input
                  type="password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
              {pwError && <p className="text-sm text-red-400">{pwError}</p>}
              {pwSuccess && <p className="text-sm" style={{ color: '#34c759' }}>Senha alterada com sucesso!</p>}
              <Button type="submit" disabled={changingPw} className="w-full">
                {changingPw ? 'Salvando…' : 'Salvar nova senha'}
              </Button>
            </form>
          </div>
        </section>

        {/* Theme section */}
        <section className="mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
            Aparência
          </h2>
          <div className="flex gap-3">
            {(['dark', 'warm'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className="flex-1 py-3 rounded-xl text-sm font-medium border transition-colors"
                style={{
                  background: theme === t ? 'var(--accent)' : 'var(--bg-card)',
                  color: theme === t ? '#fff' : 'var(--text-muted)',
                  borderColor: theme === t ? 'var(--accent)' : 'var(--border)',
                }}
              >
                {t === 'dark' ? '🌙 Dark & Bold' : '☀️ Warm & Friendly'}
              </button>
            ))}
          </div>
        </section>

        {/* Logout */}
        <section className="mb-8">
          <Button
            variant="destructive"
            className="w-full"
            onClick={logout}
          >
            Sair da conta
          </Button>
        </section>

        {/* Version */}
        <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
          Recibo42 v1.0.0
        </p>
      </div>
    </div>
  )
}
