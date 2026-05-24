import { apiFetch } from './client'

export interface LineItem {
  description: string
  quantity: number
  unit_price: number
  total: number
}

export interface Expense {
  id: string
  merchant: string
  amount: number  // cents
  date: string    // ISO date string
  category: string
  payment_method: string
  notes: string
  receipt_id: string | null
  line_items: LineItem[] | null
}

export const expensesApi = {
  list: () => apiFetch<Expense[]>('/expenses'),
  get: (id: string) => apiFetch<Expense>(`/expenses/${id}`),
  create: (body: Omit<Expense, 'id' | 'receipt_id' | 'category' | 'payment_method' | 'line_items'> & { category?: string; payment_method?: string; receipt_id?: string }) =>
    apiFetch<Expense>('/expenses', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: Partial<Omit<Expense, 'id'>>) =>
    apiFetch<Expense>(`/expenses/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id: string) =>
    apiFetch<void>(`/expenses/${id}`, { method: 'DELETE' }),
}
