import { describe, it, expect, beforeEach } from 'vitest'
import { useThemeStore } from '../themeStore'

describe('themeStore', () => {
  beforeEach(() => {
    useThemeStore.setState({ theme: 'dark' })
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
  })

  it('defaults to dark theme', () => {
    expect(useThemeStore.getState().theme).toBe('dark')
  })

  it('toggles to warm and sets data-theme attribute', () => {
    useThemeStore.getState().setTheme('warm')
    expect(useThemeStore.getState().theme).toBe('warm')
    expect(document.documentElement.getAttribute('data-theme')).toBe('warm')
  })

  it('persists theme to localStorage', () => {
    useThemeStore.getState().setTheme('warm')
    const stored = localStorage.getItem('recibo42-theme')
    const parsed = JSON.parse(stored!)
    expect(parsed.state.theme).toBe('warm')
  })
})
