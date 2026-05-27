import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { expensesApi } from '@/api/expenses'
import type { Expense } from '@/api/expenses'
import { formatBRL, formatDate } from '@/lib/utils'

const CATEGORY_COLORS: Record<string, string> = {
  'Alimentação': '#ff9500',
  'Transporte': '#007aff',
  'Saúde':      '#34c759',
  'Lazer':      '#af52de',
  'Moradia':    '#32ade6',
  'Educação':   '#5856d6',
  'Outro':      '#8e8e93',
}

function CategoryChip({ category }: { category: string }) {
  const color = CATEGORY_COLORS[category] ?? '#8e8e93'
  return (
    <span
      className="text-xs font-semibold px-1.5 py-0.5 rounded"
      style={{
        background: `${color}26`,
        color,
        lineHeight: 1,
      }}
    >
      {category}
    </span>
  )
}

function ReceiptThumb({ receiptId }: { receiptId: string | null }) {
  if (receiptId) {
    return (
      <img
        src={`/api/receipts/${receiptId}/image`}
        alt=""
        className="rounded-lg object-cover flex-shrink-0"
        style={{ width: 44, height: 44 }}
      />
    )
  }
  return (
    <div
      className="rounded-lg flex items-center justify-center flex-shrink-0 text-xl"
      style={{ width: 44, height: 44, background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      🧾
    </div>
  )
}

export function ExpenseCard({ expense, isDuplicate }: { expense: Expense; isDuplicate?: boolean }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: () => expensesApi.delete(expense.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenses'] }),
  })

  const aiProcessed = !!expense.receipt_id && !expense.is_manual && !!expense.merchant
  const reviewed = expense.status === 'reviewed'

  return (
    <div
      className="flex items-center w-full py-3 px-0 border-b cursor-pointer gap-3"
      style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
      onClick={() => navigate(`/expense/${expense.id}`)}
    >
      <ReceiptThumb receiptId={expense.receipt_id} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-medium">{expense.merchant || 'Sem nome'}</span>
          {reviewed && (
            <span
              className="text-xs font-semibold px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(52,199,89,0.15)', color: '#34c759', lineHeight: 1 }}
            >
              ✓
            </span>
          )}
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
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {expense.category ? (
            <CategoryChip category={expense.category} />
          ) : (
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Sem categoria</span>
          )}
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>· {formatDate(expense.date)}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="text-sm font-semibold">{formatBRL(expense.amount)}</div>
        {isDuplicate && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              deleteMutation.mutate()
            }}
            disabled={deleteMutation.isPending}
            className="w-7 h-7 rounded-full flex items-center justify-center text-sm"
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
