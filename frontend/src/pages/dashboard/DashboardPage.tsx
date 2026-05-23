import { useQuery } from '@tanstack/react-query'
import { expensesApi } from '@/api/expenses'
import { receiptsApi } from '@/api/receipts'
import { ExpenseCard } from '@/components/ExpenseCard'
import { SkeletonCard } from '@/components/SkeletonCard'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useAuth } from '@/hooks/useAuth'
import { useSSE } from '@/hooks/useSSE'
import { formatBRL } from '@/lib/utils'

export function DashboardPage() {
  const { user } = useAuth()
  useSSE()

  const { data: expenses, isLoading: expLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: expensesApi.list,
  })

  const { data: receipts } = useQuery({
    queryKey: ['receipts'],
    queryFn: receiptsApi.list,
  })

  const processingReceipts = receipts?.filter(
    (r) => r.status === 'pending' || r.status === 'processing'
  ) ?? []

  const totalCents = expenses?.reduce((sum, e) => sum + e.amount, 0) ?? 0

  const now = new Date()
  const monthLabel = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  const firstName = user?.email.split('@')[0] ?? ''

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-lg mx-auto px-4 pt-6 pb-2">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-lg font-bold" style={{ color: 'var(--text)' }}>
              Olá, {firstName}
            </h1>
            <p className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>
              {monthLabel}
            </p>
          </div>
          <ThemeToggle />
        </div>

        {/* Summary card */}
        <div
          className="rounded-xl p-4 mb-6"
          style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))' }}
        >
          <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'rgba(255,255,255,0.7)' }}>
            Total do mês
          </div>
          <div className="text-3xl font-bold text-white">{formatBRL(totalCents)}</div>
          <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>
            {expenses?.length ?? 0} despesas
          </div>
        </div>

        {/* Processing receipts */}
        {processingReceipts.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between py-3 border-b"
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
          >
            <span className="text-sm">Recibo em análise…</span>
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(255,159,10,0.15)', color: '#ff9f0a' }}
            >
              ⏳ Processando
            </span>
          </div>
        ))}

        {/* Expense list */}
        {expLoading
          ? Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
          : expenses?.map((e) => <ExpenseCard key={e.id} expense={e} />)
        }

        {expenses?.length === 0 && !expLoading && (
          <p className="text-center py-12 text-sm" style={{ color: 'var(--text-muted)' }}>
            Nenhuma despesa ainda. Adicione uma!
          </p>
        )}
      </div>
    </div>
  )
}
