import { useState, useEffect, useMemo, type FormEvent } from 'react'
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

  useEffect(() => {
    if (!expense) return
    setMerchant(expense.merchant ?? '')
    setAmount((expense.amount / 100).toFixed(2))
    setDate(expense.date?.slice(0, 10) ?? '')
    setCategory(expense.category ?? '')
    setPaymentMethod(expense.payment_method ?? '')
    setNotes(expense.notes ?? '')
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
              <Select key={`cat-${expense?.id}`} value={category} onValueChange={setCategory} disabled={processing}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Pagamento</Label>
              <Select key={`pay-${expense?.id}`} value={paymentMethod} onValueChange={setPaymentMethod} disabled={processing}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
