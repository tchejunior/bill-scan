import { useNavigate } from 'react-router-dom'
import { formatBRL, formatDate } from '@/lib/utils'
import type { Expense } from '@/api/expenses'

export function ExpenseCard({ expense }: { expense: Expense }) {
  const navigate = useNavigate()
  const hasImage = !!expense.receipt_id
  const aiProcessed = hasImage && !expense.is_manual && !!expense.merchant

  return (
    <button
      onClick={() => navigate(`/expense/${expense.id}`)}
      className="flex justify-between items-center w-full py-3 px-0 text-left border-b"
      style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-medium">{expense.merchant || 'Sem nome'}</span>
          {aiProcessed && (
            <span
              className="text-xs font-semibold px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(52,199,89,0.15)', color: '#34c759', lineHeight: 1 }}
            >
              ✨ IA
            </span>
          )}
          {hasImage && (
            <span
              className="text-xs font-semibold px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(90,132,255,0.15)', color: '#5a84ff', lineHeight: 1 }}
            >
              🧾
            </span>
          )}
        </div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {expense.category} · {formatDate(expense.date)}
        </div>
      </div>
      <div className="text-sm font-semibold ml-3">{formatBRL(expense.amount)}</div>
    </button>
  )
}
