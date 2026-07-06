import { useState, useRef, useMemo, type FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { expensesApi } from '@/api/expenses'
import { receiptsApi } from '@/api/receipts'
import { useIsDesktop } from '@/hooks/useIsDesktop'
import { useLayoutStore } from '@/store/layoutStore'
import { ReceiptViewer } from '@/components/ReceiptViewer'
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

// Image pane share of the split view, per layout preference
const PANE_WIDTHS: Record<string, string> = { list: '40%', table: '50%', grid: '60%' }

export function ManualEntryPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const linkedReceiptId: string | undefined = (location.state as { receiptId?: string } | null)?.receiptId
  const queryClient = useQueryClient()
  const isDesktop = useIsDesktop(1024)
  const layout = useLayoutStore((s) => s.layout)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const [lightboxOpen, setLightboxOpen] = useState(false)

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

  const merchantCategoryMap = useMemo(() => {
    if (!expenses) return {} as Record<string, string>
    return expenses
      .filter((e) => e.merchant && e.category)
      .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
      .reduce<Record<string, string>>((acc, e) => {
        if (!acc[e.merchant]) acc[e.merchant] = e.category
        return acc
      }, {})
  }, [expenses])

  const mutation = useMutation({
    mutationFn: expensesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['receipts'] })
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

  const imageSrc = linkedReceiptId
    ? `/api/receipts/${linkedReceiptId}/image`
    : receiptPreview
  const splitView = isDesktop && !!imageSrc

  const attachmentSection = (
    <div className="mb-6">
      {linkedReceiptId ? (
        <>
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className="w-full rounded-xl overflow-hidden"
            style={{ border: '1px solid var(--border)', maxHeight: 220, display: 'block' }}
          >
            <img
              src={imageSrc!}
              alt="Recibo"
              className="w-full object-cover"
              style={{ maxHeight: 220 }}
            />
          </button>
          <p className="text-xs text-center mt-1" style={{ color: 'var(--text-muted)' }}>
            Toque para ampliar
          </p>

          {lightboxOpen && (
            <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'rgba(0,0,0,0.95)' }}>
              <div className="flex justify-end items-center px-4 py-3">
                <button
                  type="button"
                  onClick={() => setLightboxOpen(false)}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white"
                  style={{ background: 'rgba(255,255,255,0.15)' }}
                >
                  ✕
                </button>
              </div>
              <ReceiptViewer src={imageSrc!} className="flex-1" />
            </div>
          )}
        </>
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
  )

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <Label>Estabelecimento</Label>
        <Input
          list="merchant-suggestions"
          value={merchant}
          onChange={(e) => {
            const val = e.target.value
            setMerchant(val)
            if (!category && merchantCategoryMap[val]) {
              setCategory(merchantCategoryMap[val])
            }
          }}
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
  )

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className={`mx-auto px-4 pt-6 pb-24 ${splitView ? 'max-w-6xl' : 'max-w-lg'}`}>
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} style={{ color: 'var(--text-muted)' }}>←</button>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text)' }}>
            {linkedReceiptId ? 'Preencher manualmente' : 'Nova despesa'}
          </h1>
        </div>

        {splitView ? (
          <div className="flex gap-6 items-start">
            <div
              className="sticky top-6 flex-shrink-0 space-y-3"
              style={{ width: PANE_WIDTHS[layout] ?? '50%' }}
            >
              <div style={{ height: 'calc(100vh - 160px)' }}>
                <ReceiptViewer src={imageSrc!} className="w-full h-full rounded-xl" />
              </div>
              {!linkedReceiptId && (
                <button
                  type="button"
                  onClick={() => { setReceiptFile(null); setReceiptPreview(null) }}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold"
                  style={{ background: 'rgba(255,59,48,0.15)', color: '#ff3b30' }}
                >
                  ✕ Remover foto
                </button>
              )}
            </div>
            <div className="flex-1 min-w-0">{formContent}</div>
          </div>
        ) : (
          <>
            {attachmentSection}
            {formContent}
          </>
        )}
      </div>
    </div>
  )
}
