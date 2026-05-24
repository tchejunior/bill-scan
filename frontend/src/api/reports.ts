import { apiFetch } from './client'

// Shape returned by the API
interface RawSummary {
  from_date: string
  to_date: string
  total_amount: string
  expense_count: number
  by_category: { category: string; amount: string; count: number }[]
  by_payment_method: { payment_method: string; amount: string; count: number }[]
}

// Shape consumed by ReportsPage
export interface CategorySummary {
  category: string
  total: number  // cents
}

export interface ReportSummary {
  from_date: string
  to_date: string
  grand_total: number  // cents
  expense_count: number
  categories: CategorySummary[]
  payment_methods: { method: string; total: number }[]
}

function tocents(reais: string): number {
  return Math.round(parseFloat(reais) * 100)
}

function mapSummary(raw: RawSummary): ReportSummary {
  return {
    from_date: raw.from_date,
    to_date: raw.to_date,
    grand_total: tocents(raw.total_amount),
    expense_count: raw.expense_count,
    categories: raw.by_category.map((c) => ({ category: c.category, total: tocents(c.amount) })),
    payment_methods: raw.by_payment_method.map((p) => ({ method: p.payment_method, total: tocents(p.amount) })),
  }
}

export const reportsApi = {
  summary: (fromDate: string, toDate: string) =>
    apiFetch<RawSummary>(`/reports/summary?from_date=${fromDate}&to_date=${toDate}`).then(mapSummary),

  pdfUrl: (fromDate: string, toDate: string) =>
    `/api/reports/pdf?from_date=${fromDate}&to_date=${toDate}`,
}
