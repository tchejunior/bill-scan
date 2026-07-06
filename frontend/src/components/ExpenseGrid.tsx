import { useNavigate } from 'react-router-dom'
import type { Expense } from '@/api/expenses'
import { formatBRL, formatDate } from '@/lib/utils'

export function ExpenseGrid({ expenses, duplicateIds }: {
  expenses: Expense[]
  duplicateIds: Set<string>
}) {
  const navigate = useNavigate()

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {expenses.map((e) => (
        <button
          key={e.id}
          onClick={() => navigate(`/expense/${e.id}`)}
          className="rounded-xl overflow-hidden text-left hover:opacity-85 transition-opacity"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <div className="w-full flex items-center justify-center overflow-hidden" style={{ height: 120, background: 'rgba(0,0,0,0.2)' }}>
            {e.receipt_id ? (
              <img
                src={`/api/receipts/${e.receipt_id}/image`}
                alt=""
                loading="lazy"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-3xl">🧾</span>
            )}
          </div>
          <div className="p-3">
            <div className="flex items-center gap-1 text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
              {e.status === 'reviewed' && <span style={{ color: '#34c759' }}>✓</span>}
              <span className="truncate">{e.merchant || 'Sem nome'}</span>
              {duplicateIds.has(e.id) && <span style={{ color: '#ff9f0a' }}>⚠</span>}
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(e.date)}</span>
              <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{formatBRL(e.amount)}</span>
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}
