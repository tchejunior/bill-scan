import { useState, useEffect, useMemo, type FormEvent } from 'react'
import type { LineItem } from '@/api/expenses'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { expensesApi, type Expense } from '@/api/expenses'
import { receiptsApi } from '@/api/receipts'
import { useScanStore } from '@/store/scanStore'
import { useLayoutStore } from '@/store/layoutStore'
import { useIsDesktop } from '@/hooks/useIsDesktop'
import { ReceiptViewer } from '@/components/ReceiptViewer'
import { SkeletonCard } from '@/components/SkeletonCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// Image pane share of the split view, per layout preference
const PANE_WIDTHS: Record<string, string> = { list: '40%', table: '50%', grid: '60%' }

function ReceiptActions({ receiptId, expenseId, onRemoved, overlay }: {
  receiptId: string
  expenseId: string
  onRemoved: () => void
  overlay?: boolean
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const setRetake = useScanStore((s) => s.setRetake)
  const [removing, setRemoving] = useState(false)

  async function handleRemove() {
    if (!confirm('Remover a imagem do recibo?')) return
    setRemoving(true)
    try {
      await receiptsApi.delete(receiptId)
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['receipts'] })
      onRemoved()
    } catch {
      alert('Erro ao remover recibo')
      setRemoving(false)
    }
  }

  function handleRetake() {
    setRetake(expenseId, receiptId)
    navigate('/scan')
  }

  return (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={handleRetake}
        className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
        style={overlay
          ? { background: 'rgba(255,255,255,0.12)', color: '#fff' }
          : { background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)' }}
      >
        📷 Refazer foto
      </button>
      <button
        type="button"
        onClick={handleRemove}
        disabled={removing}
        className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
        style={{ background: 'rgba(255,59,48,0.15)', color: '#ff3b30' }}
      >
        🗑️ Remover
      </button>
    </div>
  )
}

/** Mobile flow: thumbnail that opens a full-screen viewer modal. */
function ReceiptImage({ receiptId, expenseId, onRemoved }: {
  receiptId: string
  expenseId: string
  onRemoved: () => void
}) {
  const [open, setOpen] = useState(false)
  const imgSrc = `/api/receipts/${receiptId}/image`

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-xl overflow-hidden"
        style={{ border: '1px solid var(--border)', maxHeight: 180 }}
      >
        <img src={imgSrc} alt="Recibo" className="w-full object-cover" style={{ maxHeight: 180 }} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'rgba(0,0,0,0.95)' }}>
          <div className="flex justify-between items-center px-4 py-3">
            <span className="text-white text-sm">Recibo</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-9 h-9 rounded-full flex items-center justify-center text-white"
              style={{ background: 'rgba(255,255,255,0.15)' }}
            >
              ✕
            </button>
          </div>
          <ReceiptViewer src={imgSrc} className="flex-1" />
          <div className="px-4 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <ReceiptActions
              receiptId={receiptId}
              expenseId={expenseId}
              onRemoved={() => { setOpen(false); onRemoved() }}
              overlay
            />
          </div>
        </div>
      )}
    </>
  )
}

const CATEGORIES = ['Alimentação', 'Transporte', 'Saúde', 'Lazer', 'Moradia', 'Educação', 'Outro']
const PAYMENT_METHODS = [
  { value: 'cash', label: 'Dinheiro' },
  { value: 'credit', label: 'Crédito' },
  { value: 'debit', label: 'Débito' },
  { value: 'pix', label: 'Pix' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'other', label: 'Outro' },
]

export function ExpensePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isDesktop = useIsDesktop(1024)
  const layout = useLayoutStore((s) => s.layout)

  const { data: expense, isLoading } = useQuery<Expense>({
    queryKey: ['expense', id],
    queryFn: () => expensesApi.get(id!),
    enabled: !!id,
  })

  const { data: allExpenses } = useQuery({ queryKey: ['expenses'], queryFn: expensesApi.list })
  const merchants = useMemo(
    () => [...new Set(allExpenses?.map((e) => e.merchant).filter(Boolean) as string[])].sort(),
    [allExpenses],
  )

  const merchantCategoryMap = useMemo(() => {
    if (!allExpenses) return {} as Record<string, string>
    return allExpenses
      .filter((e) => e.merchant && e.category)
      .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
      .reduce<Record<string, string>>((acc, e) => {
        if (!acc[e.merchant]) acc[e.merchant] = e.category
        return acc
      }, {})
  }, [allExpenses])

  const [merchant, setMerchant] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState('')
  const [category, setCategory] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (!expense) return
    setMerchant(expense.merchant ?? '')
    setAmount((expense.amount / 100).toFixed(2))
    setDate(expense.date?.slice(0, 10) ?? '')
    setCategory(expense.category ?? '')
    setPaymentMethod(expense.payment_method ?? '')
    setNotes(expense.notes ?? '')
    setInitialized(true)
  }, [expense])

  const mutation = useMutation({
    mutationFn: (body: Partial<Omit<Expense, 'id'>>) => expensesApi.update(id!, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['expense', id] })
      navigate('/dashboard')
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Erro ao salvar'),
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const parsedAmount = parseFloat(amount)
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) return
    mutation.mutate({
      merchant,
      amount: Math.round(parsedAmount * 100),
      date,
      category: category || undefined,
      payment_method: paymentMethod || undefined,
      notes,
    })
  }

  // A receipt is "processing" if it has a receipt_id but merchant is not yet populated
  const processing = !!expense?.receipt_id && !expense.merchant
  const hasImage = !!expense?.receipt_id && !processing
  const splitView = isDesktop && hasImage

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-4">
      {hasImage && !splitView && (
        <ReceiptImage
          receiptId={expense!.receipt_id!}
          expenseId={expense!.id}
          onRemoved={() => queryClient.invalidateQueries({ queryKey: ['expense', id] })}
        />
      )}

      <div className="space-y-1">
        <Label>Estabelecimento</Label>
        {processing ? (
          <div className="h-10 rounded animate-pulse" style={{ background: 'var(--border)' }} />
        ) : (
          <>
            <Input
              list="merchant-suggestions"
              value={merchant}
              onChange={(e) => {
                const val = e.target.value
                setMerchant(val)
                if (initialized && merchantCategoryMap[val]) {
                  setCategory(merchantCategoryMap[val])
                }
              }}
            />
            <datalist id="merchant-suggestions">
              {merchants.map((m) => <option key={m} value={m} />)}
            </datalist>
          </>
        )}
      </div>

      <div className="space-y-1">
        <Label>Valor (R$)</Label>
        {processing ? (
          <div className="h-10 rounded animate-pulse" style={{ background: 'var(--border)' }} />
        ) : (
          <Input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        )}
      </div>

      <div className="space-y-1">
        <Label>Data</Label>
        {processing ? (
          <div className="h-10 rounded animate-pulse" style={{ background: 'var(--border)' }} />
        ) : (
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        )}
      </div>

      <div className="space-y-1">
        <Label>Categoria</Label>
        {!initialized ? (
          <div className="h-10 rounded animate-pulse" style={{ background: 'var(--border)' }} />
        ) : (
          <Select value={category} onValueChange={setCategory} disabled={processing}>
            <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="space-y-1">
        <Label>Pagamento</Label>
        {!initialized ? (
          <div className="h-10 rounded animate-pulse" style={{ background: 'var(--border)' }} />
        ) : (
          <Select value={paymentMethod} onValueChange={setPaymentMethod} disabled={processing}>
            <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
            <SelectContent>
              {PAYMENT_METHODS.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="space-y-1">
        <Label>Observações</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Adicionar nota…"
          rows={3}
        />
      </div>

      {expense?.line_items && expense.line_items.length > 0 && (
        <div className="space-y-1">
          <Label>Itens do recibo</Label>
          <div
            className="rounded-xl overflow-hidden text-sm"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            {expense.line_items.map((item: LineItem, i: number) => (
              <div
                key={i}
                className="flex items-center justify-between px-3 py-2 gap-2"
                style={{ borderBottom: i < expense.line_items!.length - 1 ? '1px solid var(--border)' : 'none' }}
              >
                <span style={{ color: 'var(--text)', flex: 1 }}>
                  {item.quantity > 1 && (
                    <span className="mr-1" style={{ color: 'var(--text-muted)' }}>{item.quantity}×</span>
                  )}
                  {item.description}
                </span>
                <span className="font-medium tabular-nums" style={{ color: 'var(--text)' }}>
                  R$ {item.total.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      <Button
        type="submit"
        className="w-full"
        disabled={processing || mutation.isPending}
        style={{ background: 'var(--accent)', color: '#fff' }}
      >
        {mutation.isPending ? 'Salvando…' : 'Salvar'}
      </Button>

      <button
        type="button"
        onClick={() => {
          if (!confirm('Excluir esta despesa?')) return
          expensesApi.delete(id!).then(() => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] })
            navigate('/dashboard')
          })
        }}
        className="w-full py-2.5 rounded-xl text-sm font-semibold"
        style={{ color: '#ff3b30', background: 'rgba(255,59,48,0.08)' }}
      >
        Excluir despesa
      </button>
    </form>
  )

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className={`mx-auto px-4 pt-6 pb-24 ${splitView ? 'max-w-6xl' : 'max-w-lg'}`}>
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} style={{ color: 'var(--text-muted)' }}>←</button>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text)' }}>Despesa</h1>
          {expense?.receipt_id && !processing && (
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded"
              style={{ background: 'rgba(52,199,89,0.15)', color: '#34c759' }}
            >
              ✨ Preenchido por IA
            </span>
          )}
          {processing && (
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded"
              style={{ background: 'rgba(255,159,10,0.15)', color: '#ff9f0a' }}
            >
              ⏳ Processando
            </span>
          )}
        </div>

        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
        ) : splitView ? (
          <div className="flex gap-6 items-start">
            <div
              className="sticky top-6 flex-shrink-0 space-y-3"
              style={{ width: PANE_WIDTHS[layout] ?? '50%' }}
            >
              <div style={{ height: 'calc(100vh - 160px)' }}>
                <ReceiptViewer
                  src={`/api/receipts/${expense!.receipt_id}/image`}
                  className="w-full h-full rounded-xl"
                />
              </div>
              <ReceiptActions
                receiptId={expense!.receipt_id!}
                expenseId={expense!.id}
                onRemoved={() => queryClient.invalidateQueries({ queryKey: ['expense', id] })}
              />
            </div>
            <div className="flex-1 min-w-0">{formContent}</div>
          </div>
        ) : (
          formContent
        )}
      </div>
    </div>
  )
}
