import { apiFetch } from './client'

export interface CategorySummary {
  category: string
  total: number  // cents
}

export interface ReportSummary {
  from_date: string
  to_date: string
  grand_total: number  // cents
  categories: CategorySummary[]
  payment_methods: { method: string; total: number }[]
}

export const reportsApi = {
  summary: (fromDate: string, toDate: string) =>
    apiFetch<ReportSummary>(`/reports/summary?from_date=${fromDate}&to_date=${toDate}`),

  pdfUrl: (fromDate: string, toDate: string) =>
    `/api/reports/pdf?from_date=${fromDate}&to_date=${toDate}`,
}
