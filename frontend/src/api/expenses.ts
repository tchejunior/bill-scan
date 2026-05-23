import { apiFetch } from './client'

export interface Expense {
  id: string
  merchant: string
  amount: number  // cents
  date: string    // ISO date string
  category: string
  payment_method: string
  notes: string
  receipt_id: string | null
}

export const expensesApi = {
  list: () => apiFetch<Expense[]>('/expenses'),
  get: (id: string) => apiFetch<Expense>(`/expenses/${id}`),
  create: (body: Omit<Expense, 'id' | 'receipt_id'>) =>
    apiFetch<Expense>('/expenses', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: Partial<Omit<Expense, 'id'>>) =>
    apiFetch<Expense>(`/expenses/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id: string) =>
    apiFetch<void>(`/expenses/${id}`, { method: 'DELETE' }),
}
