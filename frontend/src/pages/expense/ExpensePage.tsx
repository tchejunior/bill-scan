import { useState, useEffect, useMemo, useRef, useCallback, type FormEvent } from 'react'
import type { LineItem } from '@/api/expenses'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { expensesApi, type Expense } from '@/api/expenses'
import { SkeletonCard } from '@/components/SkeletonCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

function ReceiptImage({ receiptId }: { receiptId: string }) {
  const [open, setOpen] = useState(false)
  const [scale, setScale] = useState(1)
  const lastDist = useRef<number | null>(null)
  const imgSrc = `/api/receipts/${receiptId}/image`

  const getDistance = (touches: TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX
    const dy = touches[0].clientY - touches[1].clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) lastDist.current = getDistance(e.touches)
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastDist.current !== null) {
      e.preventDefault()
      const dist = getDistance(e.touches)
      const delta = dist / lastDist.current
      setScale(s => Math.min(Math.max(s * delta, 1), 5))
      lastDist.current = dist
    }
  }, [])

  const onTouchEnd = useCallback(() => { lastDist.current = null }, [])

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); setScale(1) }}
        className="w-full rounded-xl overflow-hidden"
        style={{ border: '1px solid var(--border)', maxHeight: 180 }}
      >
        <img src={imgSrc} alt="Recibo" className="w-full object-cover" style={{ maxHeight: 180 }} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex flex-col"
          style={{ background: 'rgba(0,0,0,0.95)' }}
        >
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
          <div
            className="flex-1 overflow-auto"
            style={{ touchAction: scale > 1 ? 'pan-x pan-y' : 'pan-x pan-y pinch-zoom' }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <img
              src={imgSrc}
              alt="Recibo"
              style={{
                width: `${scale * 100}%`,
                maxWidth: 'none',
                display: 'block',
                transformOrigin: 'top left',
              }}
            />
          </div>
          <p className="text-center text-xs pb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Pinça para zoom
          </p>
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
      navigate('/')
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

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
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
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {expense?.receipt_id && !processing && (
              <ReceiptImage receiptId={expense.receipt_id} />
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
                    onChange={(e) => setMerchant(e.target.value)}
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
          </form>
        )}
      </div>
    </div>
  )
}
