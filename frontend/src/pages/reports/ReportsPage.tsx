import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { reportsApi } from '@/api/reports'
import { formatBRL } from '@/lib/utils'

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Dinheiro',
  credit: 'Crédito',
  debit: 'Débito',
  pix: 'Pix',
  boleto: 'Boleto',
  other: 'Outro',
}

const PERIOD_OPTIONS = [
  { label: 'Último mês', months: 1 },
  { label: '3 meses', months: 3 },
  { label: '6 meses', months: 6 },
  { label: '12 meses', months: 12 },
]

const BAR_COLORS = ['#e94560', '#ff9f0a', '#30d158', '#bf5af2', '#0a84ff', '#ff6b35']

function getDateRange(months: number): { from: string; to: string } {
  const to = new Date()
  const from = new Date()
  from.setMonth(from.getMonth() - months)
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  }
}

export function ReportsPage() {
  const [periodMonths, setPeriodMonths] = useState(1)
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [showCustom, setShowCustom] = useState(false)

  const { from, to } = showCustom && customFrom && customTo
    ? { from: customFrom, to: customTo }
    : getDateRange(periodMonths)

  const { data: summary, isLoading } = useQuery({
    queryKey: ['reports/summary', from, to],
    queryFn: () => reportsApi.summary(from, to),
    enabled: !!from && !!to,
  })

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-lg md:max-w-2xl mx-auto px-4 pt-6 pb-24 md:pb-8">
        <h1 className="text-lg font-bold mb-6" style={{ color: 'var(--text)' }}>Relatório</h1>

        {/* Period chips */}
        <div className="flex gap-2 flex-wrap mb-4">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.months}
              onClick={() => { setPeriodMonths(opt.months); setShowCustom(false) }}
              className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
              style={{
                background: !showCustom && periodMonths === opt.months ? 'var(--accent)' : 'rgba(255,255,255,0.08)',
                color: !showCustom && periodMonths === opt.months ? '#fff' : 'var(--text-muted)',
              }}
            >
              {opt.label}
            </button>
          ))}
          <button
            onClick={() => setShowCustom((v) => !v)}
            className="px-3 py-1 rounded-full text-xs font-medium"
            style={{
              background: showCustom ? 'var(--accent)' : 'rgba(255,255,255,0.08)',
              color: showCustom ? '#fff' : 'var(--text-muted)',
            }}
          >
            📅
          </button>
        </div>

        {showCustom && (
          <div className="flex gap-3 mb-6">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="flex-1 rounded px-3 py-2 text-sm"
              style={{ background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)' }}
            />
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="flex-1 rounded px-3 py-2 text-sm"
              style={{ background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)' }}
            />
          </div>
        )}

        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-8 rounded animate-pulse" style={{ background: 'var(--border)' }} />
            ))}
          </div>
        )}

        {summary && summary.categories.length > 0 && (
          <>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Por categoria</p>

            <ResponsiveContainer width="100%" height={summary.categories.length * 44}>
              <BarChart
                data={summary.categories}
                layout="vertical"
                margin={{ top: 0, right: 60, left: 80, bottom: 0 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="category"
                  tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                  width={80}
                />
                <Tooltip
                  formatter={(v) => formatBRL(v as number)}
                  contentStyle={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    color: 'var(--text)',
                  }}
                />
                <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                  {summary.categories.map((_, idx) => (
                    <Cell key={idx} fill={BAR_COLORS[idx % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Payment methods */}
            {summary.payment_methods.length > 0 && (
              <div className="mt-6 mb-4">
                <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Por forma de pagamento</p>
                {summary.payment_methods.map((pm) => (
                  <div
                    key={pm.method}
                    className="flex justify-between py-2 text-sm border-b"
                    style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                  >
                    <span style={{ color: 'var(--text-muted)' }}>{PAYMENT_LABELS[pm.method] ?? pm.method}</span>
                    <span className="font-semibold">{formatBRL(pm.total)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Grand total */}
            <div className="flex justify-between py-3 border-t" style={{ borderColor: 'var(--border)' }}>
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Total</span>
              <span className="text-base font-bold" style={{ color: 'var(--text)' }}>
                {formatBRL(summary.grand_total)}
              </span>
            </div>

            {/* PDF export */}
            <a
              href={reportsApi.pdfUrl(from, to)}
              download
              className="block w-full mt-4 py-3 rounded-xl text-center text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))' }}
            >
              ⬇ Exportar PDF
            </a>
          </>
        )}

        {summary && summary.categories.length === 0 && !isLoading && (
          <p className="text-center py-12 text-sm" style={{ color: 'var(--text-muted)' }}>
            Nenhuma despesa no período.
          </p>
        )}
      </div>
    </div>
  )
}
