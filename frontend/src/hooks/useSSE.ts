import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from './useAuth'

export function useSSE() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!user) return

    const es = new EventSource('/api/events', { withCredentials: true })
    esRef.current = es

    es.addEventListener('receipt.processed', () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['receipts'] })
    })

    es.onerror = () => {
      // EventSource will auto-reconnect — do not call es.close() here
    }

    return () => {
      es.close()
      esRef.current = null
    }
  }, [user, queryClient])
}
