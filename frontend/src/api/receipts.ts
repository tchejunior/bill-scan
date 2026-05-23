import { apiFetch } from './client'

export interface Receipt {
  id: string
  status: 'pending' | 'processing' | 'processed' | 'failed'
  created_at: string
  image_url: string
}

export const receiptsApi = {
  list: () => apiFetch<Receipt[]>('/receipts'),
  upload: (blob: Blob, filename = 'receipt.jpg') => {
    const form = new FormData()
    form.append('file', blob, filename)
    return apiFetch<Receipt>('/receipts', { method: 'POST', body: form })
  },
}
