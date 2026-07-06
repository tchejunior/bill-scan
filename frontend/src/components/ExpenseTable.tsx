import { useNavigate } from 'react-router-dom'
import type { Expense } from '@/api/expenses'
import { formatBRL, formatDate } from '@/lib/utils'

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Dinheiro',
  credit: 'Crédito',
  debit: 'Débito',
  pix: 'Pix',
  boleto: 'Boleto',
  other: 'Outro',
}

export function ExpenseTable({ expenses, duplicateIds }: {
  expenses: Expense[]
  duplicateIds: Set<string>
}) {
  const navigate = useNavigate()

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <table className="w-full text-sm" style={{ color: 'var(--text)' }}>
        <thead>
          <tr className="text-left text-xs" style={{ color: 'var(--text-muted)' }}>
            <th className="px-4 py-3 font-medium">Data</th>
            <th className="px-4 py-3 font-medium">Estabelecimento</th>
            <th className="px-4 py-3 font-medium">Categoria</th>
            <th className="px-4 py-3 font-medium">Pagamento</th>
            <th className="px-4 py-3 font-medium text-right">Valor</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((e) => (
            <tr
              key={e.id}
              onClick={() => navigate(`/expense/${e.id}`)}
              className="cursor-pointer hover:opacity-75 transition-opacity border-t"
              style={{ borderColor: 'var(--border)' }}
            >
              <td className="px-4 py-2.5 whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                {formatDate(e.date)}
              </td>
              <td className="px-4 py-2.5">
                <span className="font-medium">{e.merchant || 'Sem nome'}</span>
                {e.status === 'reviewed' && <span className="ml-1.5" style={{ color: '#34c759' }}>✓</span>}
                {duplicateIds.has(e.id) && <span className="ml-1.5" style={{ color: '#ff9f0a' }}>⚠</span>}
              </td>
              <td className="px-4 py-2.5" style={{ color: 'var(--text-muted)' }}>
                {e.category || '—'}
              </td>
              <td className="px-4 py-2.5" style={{ color: 'var(--text-muted)' }}>
                {PAYMENT_LABELS[e.payment_method] ?? '—'}
              </td>
              <td className="px-4 py-2.5 text-right font-semibold tabular-nums whitespace-nowrap">
                {formatBRL(e.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
