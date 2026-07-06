import { useSyncExternalStore } from 'react'

/** Reactive media-query check. Defaults to Tailwind's md breakpoint. */
export function useIsDesktop(minWidth = 768): boolean {
  const query = `(min-width: ${minWidth}px)`
  return useSyncExternalStore(
    (notify) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', notify)
      return () => mql.removeEventListener('change', notify)
    },
    () => window.matchMedia(query).matches,
  )
}
