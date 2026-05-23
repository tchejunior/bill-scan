import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'dark' | 'warm'

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'dark',
      setTheme: (theme) => {
        if (theme === 'warm') {
          document.documentElement.setAttribute('data-theme', 'warm')
        } else {
          document.documentElement.removeAttribute('data-theme')
        }
        set({ theme })
      },
    }),
    { name: 'recibo42-theme' },
  ),
)

// Apply persisted theme on module load
const stored = useThemeStore.getState().theme
if (stored === 'warm') {
  document.documentElement.setAttribute('data-theme', 'warm')
}
