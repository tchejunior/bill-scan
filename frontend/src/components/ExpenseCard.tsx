import { useNavigate } from 'react-router-dom'
import { formatBRL, formatDate } from '@/lib/utils'
import type { Expense } from '@/api/expenses'

export function ExpenseCard({ expense }: { expense: Expense }) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(`/expense/${expense.id}`)}
      className="flex justify-between items-center w-full py-3 px-0 text-left border-b"
      style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
    >
      <div>
        <div className="text-sm font-medium">{expense.merchant || 'Sem nome'}</div>
        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {expense.category} · {formatDate(expense.date)}
        </div>
      </div>
      <div className="text-sm font-semibold">{formatBRL(expense.amount)}</div>
    </button>
  )
}
