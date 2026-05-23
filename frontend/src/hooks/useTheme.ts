import { useThemeStore } from '@/store/themeStore'

export function useTheme() {
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)
  const toggle = () => setTheme(theme === 'dark' ? 'warm' : 'dark')
  return { theme, setTheme, toggle }
}
