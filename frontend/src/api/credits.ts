import { apiFetch } from './client'

export interface CreditStatus {
  available: boolean
  next_credit_at: string | null
  failed_count: number
}

export interface RetryFailedResponse {
  retried_count: number
  next_credit_at: string
}

export const creditsApi = {
  status: () => apiFetch<CreditStatus>('/credits'),
  retryFailed: () => apiFetch<RetryFailedResponse>('/credits/retry-failed', { method: 'POST' }),
}
