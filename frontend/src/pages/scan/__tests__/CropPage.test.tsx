import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { expensesApi } from '@/api/expenses'
import { receiptsApi } from '@/api/receipts'
import { useScanStore } from '@/store/scanStore'
import { CropPage } from '../CropPage'

const navigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigate,
  }
})

vi.mock('cropperjs', () => ({
  default: class MockCropper {
    constructor(_element: HTMLImageElement, options: { ready?: () => void }) {
      options.ready?.()
    }

    getCroppedCanvas() {
      return {
        toBlob: (callback: BlobCallback) => {
          callback(new Blob(['replacement'], { type: 'image/jpeg' }))
        },
      }
    }

    setData() {}
    destroy() {}
  },
}))

vi.mock('@/api/expenses', () => ({
  expensesApi: {
    update: vi.fn(),
  },
}))

vi.mock('@/api/receipts', () => ({
  receiptsApi: {
    upload: vi.fn(),
    delete: vi.fn(),
    detectEdges: vi.fn(),
  },
}))

describe('CropPage retake flow', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:receipt'),
      revokeObjectURL: vi.fn(),
    })
    navigate.mockReset()
    vi.mocked(receiptsApi.detectEdges).mockResolvedValue({ points: null })
    vi.mocked(receiptsApi.upload).mockResolvedValue({
      id: 'new-receipt',
      status: 'pending',
      created_at: '2026-07-07T00:00:00Z',
      image_url: '/api/receipts/new-receipt/image',
    })
    vi.mocked(receiptsApi.delete).mockResolvedValue(undefined)
    vi.mocked(expensesApi.update).mockResolvedValue({
      id: 'expense-1',
      merchant: 'Padaria',
      amount: 1200,
      date: '2026-07-07',
      category: 'Alimentacao',
      payment_method: 'credit',
      notes: '',
      receipt_id: 'new-receipt',
      line_items: null,
      is_manual: false,
      status: 'reviewed',
    })
    useScanStore.setState({
      capturedBlob: new Blob(['original'], { type: 'image/jpeg' }),
      retakeExpenseId: 'expense-1',
      retakeOldReceiptId: 'old-receipt',
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
    useScanStore.setState({
      capturedBlob: null,
      retakeExpenseId: null,
      retakeOldReceiptId: null,
    })
  })

  it('refreshes the reopened expense after replacing its receipt', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    queryClient.setQueryData(['expense', 'expense-1'], {
      id: 'expense-1',
      merchant: 'Padaria',
      amount: 1200,
      date: '2026-07-07',
      category: 'Alimentacao',
      payment_method: 'credit',
      notes: '',
      receipt_id: 'old-receipt',
      line_items: null,
      is_manual: false,
      status: 'reviewed',
    })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/scan/crop']}>
          <CropPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    fireEvent.load(screen.getByAltText('Recibo'))
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }))

    await waitFor(() => {
      expect(expensesApi.update).toHaveBeenCalledWith('expense-1', { receipt_id: 'new-receipt' })
      expect(receiptsApi.delete).toHaveBeenCalledWith('old-receipt')
      expect(queryClient.getQueryData<{ receipt_id: string }>(['expense', 'expense-1'])?.receipt_id).toBe('new-receipt')
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['expense', 'expense-1'] })
      expect(navigate).toHaveBeenCalledWith('/expense/expense-1')
    })
  })
})
