import { useState, useRef, useMemo, type FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { expensesApi } from '@/api/expenses'
import { receiptsApi } from '@/api/receipts'
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

export function ManualEntryPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const linkedReceiptId: string | undefined = (location.state as { receiptId?: string } | null)?.receiptId
  const queryClient = useQueryClient()
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  const [merchant, setMerchant] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [category, setCategory] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null)

  const { data: expenses } = useQuery({ queryKey: ['expenses'], queryFn: expensesApi.list })
  const merchants = useMemo(
    () => [...new Set(expenses?.map((e) => e.merchant).filter(Boolean) as string[])].sort(),
    [expenses],
  )

  const mutation = useMutation({
    mutationFn: expensesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      navigate('/dashboard')
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Erro ao salvar'),
  })

  function handleFileSelected(file: File) {
    setReceiptFile(file)
    setReceiptPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!amount || parseFloat(amount) <= 0) { setError('Informe um valor válido'); return }

    let receipt_id: string | undefined = linkedReceiptId
    if (!receipt_id && receiptFile) {
      try {
        const receipt = await receiptsApi.upload(receiptFile)
        receipt_id = receipt.id
      } catch {
        setError('Erro ao enviar foto do recibo')
        return
      }
    }

    mutation.mutate({
      merchant,
      amount: Math.round(parseFloat(amount) * 100),
      date,
      category: category || undefined,
      payment_method: paymentMethod || undefined,
      notes,
      receipt_id,
    })
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} style={{ color: 'var(--text-muted)' }}>←</button>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text)' }}>
            {linkedReceiptId ? 'Preencher manualmente' : 'Nova despesa'}
          </h1>
        </div>

        {/* Receipt attachment */}
        <div className="mb-6">
          {linkedReceiptId ? (
            <img
              src={`/api/receipts/${linkedReceiptId}/image`}
              alt="Recibo"
              className="w-full rounded-xl object-cover"
              style={{ maxHeight: 220 }}
            />
          ) : receiptPreview ? (
            <div className="relative">
              <img
                src={receiptPreview}
                alt="Recibo"
                className="w-full rounded-xl object-cover"
                style={{ maxHeight: 180 }}
              />
              <button
                type="button"
                onClick={() => { setReceiptFile(null); setReceiptPreview(null) }}
                className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold"
                style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}
              >
                ✕
              </button>
            </div>
          ) : (
            <div
              className="rounded-xl flex gap-3 p-4 justify-center"
              style={{ background: 'var(--bg-card)', border: '1px dashed var(--border)' }}
            >
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex-1 flex flex-col items-center gap-1 py-3 rounded-lg text-sm font-medium"
                style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)' }}
              >
                <span className="text-2xl">📷</span>
                Escanear
              </button>
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="flex-1 flex flex-col items-center gap-1 py-3 rounded-lg text-sm font-medium"
                style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)' }}
              >
                <span className="text-2xl">🖼️</span>
                Galeria
              </button>
            </div>
          )}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFileSelected(e.target.files[0])}
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFileSelected(e.target.files[0])}
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Estabelecimento</Label>
            <Input
              list="merchant-suggestions"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder="Ex: Supermercado Extra"
            />
            <datalist id="merchant-suggestions">
              {merchants.map((m) => <option key={m} value={m} />)}
            </datalist>
          </div>

          <div className="space-y-1">
            <Label>Valor (R$) *</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
            />
          </div>

          <div className="space-y-1">
            <Label>Data</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>

          <div className="space-y-1">
            <Label>Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Pagamento</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Adicionar nota…" rows={3} />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button
            type="submit"
            className="w-full"
            disabled={mutation.isPending}
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            {mutation.isPending ? 'Salvando…' : 'Salvar'}
          </Button>
        </form>
      </div>
    </div>
  )
}
