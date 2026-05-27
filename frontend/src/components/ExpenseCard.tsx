import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { expensesApi } from '@/api/expenses'
import type { Expense } from '@/api/expenses'
import { formatBRL, formatDate } from '@/lib/utils'

export function ExpenseCard({ expense, isDuplicate }: { expense: Expense; isDuplicate?: boolean }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: () => expensesApi.delete(expense.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenses'] }),
  })

  const hasImage = !!expense.receipt_id
  const aiProcessed = hasImage && !expense.is_manual && !!expense.merchant

  return (
    <div
      className="flex justify-between items-center w-full py-3 px-0 border-b cursor-pointer"
      style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
      onClick={() => navigate(`/expense/${expense.id}`)}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-medium">{expense.merchant || 'Sem nome'}</span>
          {isDuplicate && (
            <span
              className="text-xs font-semibold px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(255,159,10,0.15)', color: '#ff9f0a', lineHeight: 1 }}
            >
              ⚠ Duplicado
            </span>
          )}
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
      <div className="flex items-center gap-2 ml-3">
        <div className="text-sm font-semibold">{formatBRL(expense.amount)}</div>
        {isDuplicate && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              deleteMutation.mutate()
            }}
            disabled={deleteMutation.isPending}
            className="w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0"
            style={{ background: 'rgba(233,69,96,0.15)', color: '#e94560' }}
            aria-label="Excluir duplicado"
          >
            {deleteMutation.isPending ? '…' : '🗑'}
          </button>
        )}
      </div>
    </div>
  )
}
