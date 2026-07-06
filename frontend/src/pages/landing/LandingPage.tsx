import { useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Logo, LogoMark } from '@/components/Logo'

const FEATURES = [
  {
    icon: '📷',
    title: 'Escaneie com a câmera',
    body: 'Fotografe o recibo e a IA extrai vendedor, valor, data e itens em segundos.',
  },
  {
    icon: '✨',
    title: 'Preenchimento automático',
    body: 'Sem digitar nada. Categoria, forma de pagamento e linha de itens detectados automaticamente.',
  },
  {
    icon: '📊',
    title: 'Controle seus gastos',
    body: 'Veja para onde vai seu dinheiro por categoria. Relatórios mensais sempre à mão.',
  },
  {
    icon: '🔒',
    title: 'Seguro e privado',
    body: 'Seus dados ficam em servidores seguros, acessíveis só por você.',
  },
]

export function LandingPage() {
  const { user, isLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading && user) navigate('/dashboard', { replace: true })
  }, [user, isLoading, navigate])

  if (isLoading) return null

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Top nav */}
      <header
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <Logo markSize={22} textClassName="text-lg" />
        <Link
          to="/login"
          className="px-4 py-1.5 rounded-full text-sm font-semibold"
          style={{ border: '1px solid var(--accent)', color: 'var(--accent)' }}
        >
          Entrar
        </Link>
      </header>

      {/* Hero */}
      <section className="flex flex-col items-center text-center px-6 pt-14 pb-12">
        <div className="mb-6"><LogoMark size={72} /></div>
        <h1 className="text-3xl font-bold leading-tight mb-4" style={{ color: 'var(--text)' }}>
          Seus recibos organizados<br />com inteligência artificial.
        </h1>
        <p className="text-base mb-8 max-w-xs" style={{ color: 'var(--text-muted)' }}>
          Fotografe o recibo. A IA extrai tudo. Você acompanha seus gastos sem esforço.
        </p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Link
            to="/register"
            className="w-full py-3 rounded-xl text-sm font-bold text-center text-white"
            style={{ background: 'var(--accent)' }}
          >
            Criar conta grátis
          </Link>
          <Link
            to="/login"
            className="w-full py-3 rounded-xl text-sm font-semibold text-center"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text)' }}
          >
            Já tenho conta
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="px-5 pb-12">
        <div className="grid grid-cols-1 gap-4 max-w-sm mx-auto">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl p-4 flex gap-4 items-start"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <span className="text-2xl mt-0.5">{f.icon}</span>
              <div>
                <div className="text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>{f.title}</div>
                <div className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{f.body}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section
        className="mt-auto px-6 py-10 flex flex-col items-center text-center"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <p className="text-base font-semibold mb-4" style={{ color: 'var(--text)' }}>
          Pronto para começar?
        </p>
        <Link
          to="/register"
          className="px-8 py-3 rounded-xl text-sm font-bold text-white"
          style={{ background: 'var(--accent)' }}
        >
          Criar conta grátis
        </Link>
        <p className="text-xs mt-6" style={{ color: 'var(--text-muted)' }}>
          © {new Date().getFullYear()} Recibo42
        </p>
      </section>
    </div>
  )
}
