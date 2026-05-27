import { useState, useEffect, useMemo, useRef, useCallback, type FormEvent } from 'react'
import type { LineItem } from '@/api/expenses'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { expensesApi, type Expense } from '@/api/expenses'
import { receiptsApi } from '@/api/receipts'
import { useScanStore } from '@/store/scanStore'
import { SkeletonCard } from '@/components/SkeletonCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

function ReceiptImage({ receiptId, expenseId, onRemoved }: {
  receiptId: string
  expenseId: string
  onRemoved: () => void
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const setRetake = useScanStore((s) => s.setRetake)
  const [open, setOpen] = useState(false)
  const [scale, setScale] = useState(1)
  const [minScale, setMinScale] = useState(1)
  const minScaleRef = useRef(1)
  const [removing, setRemoving] = useState(false)
  const lastDist = useRef<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const imgSrc = `/api/receipts/${receiptId}/image`

  function onImageLoad() {
    const img = imgRef.current
    const container = containerRef.current
    if (!img || !container) return
    const { naturalWidth, naturalHeight } = img
    const w = container.clientWidth
    const h = container.clientHeight
    if (!naturalWidth || !naturalHeight || !w || !h) return
    const fit = Math.max((h * naturalWidth) / (w * naturalHeight), 0.1)
    const ms = Math.min(fit, 1)
    minScaleRef.current = ms
    setMinScale(ms)
    setScale(ms)
  }

  const getDistance = (touches: React.TouchList) => {
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
      setScale(s => Math.min(Math.max(s * delta, minScaleRef.current), 5))
      lastDist.current = dist
    }
  }, [])

  const onTouchEnd = useCallback(() => { lastDist.current = null }, [])

  async function handleRemove() {
    if (!confirm('Remover a imagem do recibo?')) return
    setRemoving(true)
    try {
      await receiptsApi.delete(receiptId)
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['receipts'] })
      setOpen(false)
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
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); setScale(1); setMinScale(1); minScaleRef.current = 1 }}
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
            ref={containerRef}
            className="flex-1 overflow-auto flex justify-center items-start"
            style={{ touchAction: scale > minScale ? 'pan-x pan-y' : 'pan-x pan-y pinch-zoom' }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <img
              ref={imgRef}
              src={imgSrc}
              alt="Recibo"
              onLoad={onImageLoad}
              style={{ width: `${scale * 100}%`, maxWidth: 'none', display: 'block' }}
            />
          </div>
          <div className="flex gap-3 px-4 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setScale((s) => Math.max(s - 0.25, minScale))}
                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-lg font-bold"
                style={{ background: 'rgba(255,255,255,0.15)' }}
              >
                −
              </button>
              <button
                type="button"
                onClick={() => setScale((s) => Math.min(s + 0.25, 5))}
                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-lg font-bold"
                style={{ background: 'rgba(255,255,255,0.15)' }}
              >
                +
              </button>
            </div>
            <button
              type="button"
              onClick={handleRetake}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'rgba(255,255,255,0.12)' }}
            >
              📷 Refazer foto
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={removing}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: 'rgba(255,59,48,0.2)', color: '#ff3b30' }}
            >
              🗑️ Remover
            </button>
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
              <ReceiptImage
                receiptId={expense.receipt_id}
                expenseId={expense.id}
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
        )}
      </div>
    </div>
  )
}
