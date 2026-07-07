import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { creditsApi } from '@/api/credits'
import { expensesApi } from '@/api/expenses'
import { receiptsApi } from '@/api/receipts'
import { ExpenseCard } from '@/components/ExpenseCard'
import { ExpenseGrid } from '@/components/ExpenseGrid'
import { ExpenseTable } from '@/components/ExpenseTable'
import { useIsDesktop } from '@/hooks/useIsDesktop'
import { useLayoutStore } from '@/store/layoutStore'
import { SkeletonCard } from '@/components/SkeletonCard'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useAuth } from '@/hooks/useAuth'
import { formatBRL } from '@/lib/utils'

export function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()
  const [{ cutoff, monthLabel }] = useState(() => {
    const now = new Date()
    const cutoffDate = new Date(now)
    cutoffDate.setDate(cutoffDate.getDate() - 30)
    return {
      cutoff: cutoffDate.toLocaleDateString('en-CA'),
      monthLabel: now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
    }
  })
  const layoutPref = useLayoutStore((s) => s.layout)
  const layout = isDesktop ? layoutPref : 'list'

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

  const failedReceipts = receipts?.filter((r) => r.status === 'failed') ?? []
  const partialReceipts = receipts?.filter((r) => r.status === 'partial') ?? []

  const queryClient = useQueryClient()
  const { data: credit } = useQuery({
    queryKey: ['credits'],
    queryFn: creditsApi.status,
    enabled: failedReceipts.length > 0,
  })
  const retryMutation = useMutation({
    mutationFn: creditsApi.retryFailed,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] })
      queryClient.invalidateQueries({ queryKey: ['credits'] })
    },
  })

  const duplicateIds = useMemo(() => {
    if (!expenses) return new Set<string>()
    const groups = new Map<string, string[]>()
    for (const e of expenses) {
      if (!e.merchant) continue
      const key = `${e.merchant.toLowerCase().trim()}|${e.date}|${e.amount}`
      const ids = groups.get(key) ?? []
      ids.push(e.id)
      groups.set(key, ids)
    }
    const dupes = new Set<string>()
    for (const ids of groups.values()) {
      if (ids.length > 1) ids.forEach((id) => dupes.add(id))
    }
    return dupes
  }, [expenses])

  // Header summary covers the last 30 days only; the list below shows everything
  const last30 = useMemo(
    () => expenses?.filter((e) => e.date >= cutoff) ?? [],
    [expenses, cutoff]
  )
  const totalCents = last30.reduce((sum, e) => sum + e.amount, 0)

  const PAGE_SIZE = 20
  const [page, setPage] = useState(0)
  const pageCount = Math.max(1, Math.ceil((expenses?.length ?? 0) / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount - 1)
  const pagedExpenses = expenses?.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE) ?? []

  const firstName = user?.display_name || user?.email.split('@')[0] || ''

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className={`max-w-lg mx-auto px-4 pt-6 pb-2 ${layout === 'list' ? 'md:max-w-2xl' : 'md:max-w-5xl'}`}>
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
            Últimos 30 dias
          </div>
          <div className="text-3xl font-bold text-white">{formatBRL(totalCents)}</div>
          <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>
            {last30.length} despesas
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

        {/* Partial receipts */}
        {partialReceipts.map((r) => {
          const linked = expenses?.find((e) => e.receipt_id === r.id)
          return (
            <div
              key={r.id}
              className="flex items-center justify-between py-3 border-b gap-3"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            >
              <img
                src={`/api/receipts/${r.id}/image`}
                alt="Recibo"
                className="rounded-lg object-cover flex-shrink-0"
                style={{ width: 44, height: 44 }}
              />
              <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                <span className="text-sm">Leitura parcial</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Alguns dados não foram detectados
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(255,159,10,0.15)', color: '#ff9f0a' }}
                >
                  ⚠ Parcial
                </span>
                <button
                  onClick={() => linked
                    ? navigate(`/expense/${linked.id}`)
                    : navigate('/expense/new', { state: { receiptId: r.id } })}
                  className="text-xs font-semibold px-3 py-1 rounded-full"
                  style={{ background: 'var(--accent)', color: '#fff' }}
                >
                  Revisar
                </button>
              </div>
            </div>
          )
        })}

        {/* Weekly retry credit banner */}
        {failedReceipts.length > 0 && credit && (
          <div
            className="flex items-center justify-between py-3 px-3 mt-2 mb-1 rounded-xl gap-3"
            style={{ background: 'rgba(233,69,96,0.08)', color: 'var(--text)' }}
          >
            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
              <span className="text-sm font-semibold">
                {failedReceipts.length} {failedReceipts.length === 1 ? 'recibo falhou' : 'recibos falharam'}
              </span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {credit.available
                  ? 'Use seu crédito semanal para tentar ler novamente'
                  : `Próximo crédito: ${new Date(credit.next_credit_at!).toLocaleDateString('pt-BR')}`}
              </span>
            </div>
            {credit.available && (
              <button
                onClick={() => retryMutation.mutate()}
                disabled={retryMutation.isPending}
                className="text-xs font-semibold px-3 py-1.5 rounded-full flex-shrink-0 disabled:opacity-60"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                {retryMutation.isPending ? 'Enviando…' : 'Tentar novamente'}
              </button>
            )}
          </div>
        )}

        {/* Failed receipts */}
        {failedReceipts.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between py-3 border-b gap-3"
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
          >
            <img
              src={`/api/receipts/${r.id}/image`}
              alt="Recibo"
              className="rounded-lg object-cover flex-shrink-0"
              style={{ width: 44, height: 44 }}
            />
            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
              <span className="text-sm">Leitura falhou</span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Preencha os dados manualmente
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(233,69,96,0.15)', color: '#e94560' }}
              >
                ✕ Falhou
              </span>
              <button
                onClick={() => navigate('/expense/new', { state: { receiptId: r.id } })}
                className="text-xs font-semibold px-3 py-1 rounded-full"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                Preencher
              </button>
            </div>
          </div>
        ))}

        {/* Expense list — presentation follows the selected desktop layout */}
        {expLoading ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
        ) : layout === 'table' ? (
          <div className="mt-4">
            <ExpenseTable expenses={pagedExpenses} duplicateIds={duplicateIds} />
          </div>
        ) : layout === 'grid' ? (
          <div className="mt-4">
            <ExpenseGrid expenses={pagedExpenses} duplicateIds={duplicateIds} />
          </div>
        ) : (
          pagedExpenses.map((e) => <ExpenseCard key={e.id} expense={e} isDuplicate={duplicateIds.has(e.id)} />)
        )}

        {pageCount > 1 && !expLoading && (
          <div className="flex items-center justify-center gap-4 mt-4 pb-4">
            <button
              onClick={() => setPage(currentPage - 1)}
              disabled={currentPage === 0}
              className="text-xs font-semibold px-3 py-1.5 rounded-full disabled:opacity-40"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text)' }}
            >
              Anterior
            </button>
            <span className="text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
              {currentPage + 1} / {pageCount}
            </span>
            <button
              onClick={() => setPage(currentPage + 1)}
              disabled={currentPage >= pageCount - 1}
              className="text-xs font-semibold px-3 py-1.5 rounded-full disabled:opacity-40"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text)' }}
            >
              Próxima
            </button>
          </div>
        )}

        {expenses?.length === 0 && !expLoading && (
          <p className="text-center py-12 text-sm" style={{ color: 'var(--text-muted)' }}>
            Nenhuma despesa ainda. Adicione uma!
          </p>
        )}
      </div>
    </div>
  )
}
