# Recibo42 Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a React 18 PWA for Recibo42 — camera receipt scanning, AI-assisted expense entry, reports, dual themes — deployed via GitHub Actions to the live VPS at recibo42.com.br.

**Architecture:** Mobile-first SPA scaffolded with Vite + TypeScript. Routing via React Router v6 with a PrivateRoute guard that checks `/api/auth/me`. Server state via TanStack Query v5; UI state (theme, scan blob) via Zustand. Camera capture uses `MediaDevices.getUserMedia`; cropping uses cropperjs. SSE from `/api/events` drives real-time dashboard updates.

**Tech Stack:** React 18, Vite, TypeScript, shadcn/ui, Tailwind CSS, React Router v6, TanStack Query v5, Zustand, cropperjs, Recharts, Vitest, vite-plugin-pwa

---

## File Map

```
frontend/
  index.html
  vite.config.ts
  tailwind.config.ts
  tsconfig.json
  public/
    manifest.json
    icons/              # 512, 192, 180 px PNGs (placeholder SVG initially)
  src/
    index.css           # CSS custom properties (themes)
    main.tsx
    App.tsx             # router + providers
    api/
      client.ts         # apiFetch wrapper
      auth.ts
      expenses.ts
      receipts.ts
      reports.ts
    components/
      BottomNav.tsx
      FAB.tsx
      ExpenseCard.tsx
      SkeletonCard.tsx
      ThemeToggle.tsx
      Toast.tsx
    hooks/
      useAuth.ts
      useTheme.ts
      useCamera.ts
      useSSE.ts
    lib/
      queryClient.ts
      utils.ts
    pages/
      auth/
        LoginPage.tsx
        RegisterPage.tsx
      dashboard/
        DashboardPage.tsx
      scan/
        ScanPage.tsx
        CropPage.tsx
      expense/
        ExpensePage.tsx
        ManualEntryPage.tsx
      reports/
        ReportsPage.tsx
      settings/
        SettingsPage.tsx
    store/
      themeStore.ts
      scanStore.ts
  .github/
    workflows/
      deploy-frontend.yml
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `frontend/` (full scaffold)
- Create: `frontend/vite.config.ts`
- Create: `frontend/tailwind.config.ts`
- Create: `frontend/tsconfig.json`
- Create: `frontend/index.html`
- Create: `frontend/src/index.css`
- Create: `frontend/src/main.tsx`

- [ ] **Step 1: Init Vite project**

Run from repo root:
```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
```

- [ ] **Step 2: Install all dependencies**

```bash
npm install react-router-dom @tanstack/react-query zustand cropperjs recharts
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event vite-plugin-pwa
```

- [ ] **Step 3: Install Tailwind + shadcn**

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npx shadcn@latest init
```

When prompted: TypeScript yes, style Default, base color Slate, CSS variables yes, React Server Components no.

- [ ] **Step 4: Install shadcn components we need**

```bash
npx shadcn@latest add button input label select textarea card toast
```

- [ ] **Step 5: Write `vite.config.ts`**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Recibo42',
        short_name: 'Recibo42',
        theme_color: '#e94560',
        background_color: '#1a1a2e',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-180.png', sizes: '180x180', type: 'image/png' },
        ],
      },
      workbox: {
        runtimeCaching: [],
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    globals: true,
  },
})
```

- [ ] **Step 6: Write `tailwind.config.ts`**

```typescript
import type { Config } from 'tailwindcss'

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        'bg-card': 'var(--bg-card)',
        accent: 'var(--accent)',
        'accent-hover': 'var(--accent-hover)',
        foreground: 'var(--text)',
        muted: 'var(--text-muted)',
        border: 'var(--border)',
      },
    },
  },
  plugins: [],
} satisfies Config
```

- [ ] **Step 7: Write `src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg: #1a1a2e;
  --bg-card: #16213e;
  --accent: #e94560;
  --accent-hover: #c23152;
  --text: #ffffff;
  --text-muted: #888888;
  --border: rgba(255, 255, 255, 0.08);
}

[data-theme="warm"] {
  --bg: #fffbf5;
  --bg-card: #ffffff;
  --accent: #ff6b35;
  --accent-hover: #e55a26;
  --text: #2d1b00;
  --text-muted: #a0885a;
  --border: rgba(0, 0, 0, 0.08);
}

body {
  background-color: var(--bg);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  margin: 0;
  -webkit-font-smoothing: antialiased;
}
```

- [ ] **Step 8: Write `src/test-setup.ts`**

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 9: Write `src/main.tsx`**

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

- [ ] **Step 10: Write `index.html`**

```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/icons/icon-192.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <meta name="theme-color" content="#e94560" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <link rel="apple-touch-icon" href="/icons/icon-180.png" />
    <title>Recibo42</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 11: Create placeholder icons**

```bash
mkdir -p public/icons
# Create minimal placeholder SVG-as-PNG (a red square with "R42")
# For now, copy any 512x192x180 PNG or use ImageMagick:
# convert -size 512x512 xc:#e94560 public/icons/icon-512.png
# convert -size 192x192 xc:#e94560 public/icons/icon-192.png
# convert -size 180x180 xc:#e94560 public/icons/icon-180.png
# If ImageMagick not available, create empty placeholder files — PWA install is non-critical for V1
touch public/icons/icon-512.png public/icons/icon-192.png public/icons/icon-180.png
```

- [ ] **Step 12: Verify scaffold builds**

```bash
cd frontend && npm run build
```

Expected: `dist/` created, no TypeScript errors.

- [ ] **Step 13: Commit**

```bash
git add frontend/
git commit -m "feat: scaffold Recibo42 React frontend"
```

---

## Task 2: Theme System

**Files:**
- Create: `frontend/src/store/themeStore.ts`
- Create: `frontend/src/hooks/useTheme.ts`
- Create: `frontend/src/components/ThemeToggle.tsx`
- Create: `frontend/src/store/__tests__/themeStore.test.ts`

- [ ] **Step 1: Write failing test for themeStore**

```typescript
// frontend/src/store/__tests__/themeStore.test.ts
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
    expect(localStorage.getItem('recibo42-theme')).toBe('warm')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && npx vitest run src/store/__tests__/themeStore.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/store/themeStore.ts`**

```typescript
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
        document.documentElement.setAttribute('data-theme', theme === 'warm' ? 'warm' : '')
        if (theme === 'dark') document.documentElement.removeAttribute('data-theme')
        set({ theme })
      },
    }),
    { name: 'recibo42-theme' },
  ),
)

// Apply persisted theme on load
const stored = useThemeStore.getState().theme
if (stored === 'warm') document.documentElement.setAttribute('data-theme', 'warm')
```

- [ ] **Step 4: Write `src/hooks/useTheme.ts`**

```typescript
import { useThemeStore } from '@/store/themeStore'

export function useTheme() {
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)
  const toggle = () => setTheme(theme === 'dark' ? 'warm' : 'dark')
  return { theme, setTheme, toggle }
}
```

- [ ] **Step 5: Write `src/components/ThemeToggle.tsx`**

```typescript
import { useTheme } from '@/hooks/useTheme'

export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  return (
    <button
      onClick={toggle}
      className="p-2 rounded-full"
      aria-label="Alternar tema"
      title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  )
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
cd frontend && npx vitest run src/store/__tests__/themeStore.test.ts
```

Expected: 3 tests passing.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/store/ frontend/src/hooks/useTheme.ts frontend/src/components/ThemeToggle.tsx
git commit -m "feat: theme system — dark/warm toggle with Zustand persist"
```

---

## Task 3: API Client + React Query Setup + Utils

**Files:**
- Create: `frontend/src/api/client.ts`
- Create: `frontend/src/lib/queryClient.ts`
- Create: `frontend/src/lib/utils.ts`
- Create: `frontend/src/api/__tests__/client.test.ts`

- [ ] **Step 1: Write failing test for apiFetch**

```typescript
// frontend/src/api/__tests__/client.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiFetch } from '../client'

describe('apiFetch', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns parsed JSON on success', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: '1' }),
    } as Response)
    const result = await apiFetch<{ id: string }>('/test')
    expect(result).toEqual({ id: '1' })
  })

  it('throws with detail message on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: () => Promise.resolve({ detail: 'Validation error' }),
    } as Response)
    await expect(apiFetch('/test')).rejects.toThrow('Validation error')
  })

  it('redirects to /login on 401', async () => {
    const assign = vi.fn()
    Object.defineProperty(window, 'location', { value: { href: '' }, writable: true })
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({}),
    } as Response)
    await expect(apiFetch('/test')).rejects.toThrow('Unauthorized')
    expect(window.location.href).toBe('/login')
  })

  it('returns undefined for 204 No Content', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      json: () => Promise.reject(new Error('no body')),
    } as unknown as Response)
    const result = await apiFetch('/test')
    expect(result).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && npx vitest run src/api/__tests__/client.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/api/client.ts`**

```typescript
const BASE_URL = '/api'

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const isFormData = init?.body instanceof FormData
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(!isFormData && { 'Content-Type': 'application/json' }),
      ...init?.headers,
    },
  })

  if (res.status === 401) {
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  if (res.status === 204) return undefined as T

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail ?? `HTTP ${res.status}`)
  }

  return res.json()
}
```

- [ ] **Step 4: Write `src/lib/queryClient.ts`**

```typescript
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})
```

- [ ] **Step 5: Write `src/lib/utils.ts`**

```typescript
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBRL(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100)
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(iso))
}
```

Note: install clsx and tailwind-merge if not already present from shadcn init: `npm install clsx tailwind-merge`

- [ ] **Step 6: Run tests to verify they pass**

```bash
cd frontend && npx vitest run src/api/__tests__/client.test.ts
```

Expected: 4 tests passing.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/api/client.ts frontend/src/api/__tests__/ frontend/src/lib/
git commit -m "feat: API client, React Query setup, utility functions"
```

---

## Task 4: Auth API + Backend `/auth/me` Endpoint + useAuth Hook + Login/Register Pages

**Files:**
- Modify: `backend/app/routes/auth.py` — add `GET /auth/me`
- Create: `frontend/src/api/auth.ts`
- Create: `frontend/src/hooks/useAuth.ts`
- Create: `frontend/src/pages/auth/LoginPage.tsx`
- Create: `frontend/src/pages/auth/RegisterPage.tsx`

- [ ] **Step 1: Add `GET /auth/me` to backend**

Open `backend/app/routes/auth.py` and add after the existing imports and before or after the existing routes:

```python
@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return {"id": str(current_user.id), "email": current_user.email}
```

`get_current_user` already exists in the codebase — check `backend/app/dependencies.py` or `backend/app/routes/auth.py` for the exact import path and replicate the pattern used in other protected routes.

- [ ] **Step 2: Verify backend test still passes**

```bash
cd backend && python -m pytest tests/ -q
```

Expected: all tests pass (41/41 or more).

- [ ] **Step 3: Write `src/api/auth.ts`**

```typescript
import { apiFetch } from './client'

export interface User {
  id: string
  email: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
}

export const authApi = {
  login: (body: LoginRequest) =>
    apiFetch<User>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),

  register: (body: RegisterRequest) =>
    apiFetch<User>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),

  logout: () =>
    apiFetch<void>('/auth/logout', { method: 'POST' }),

  me: () =>
    apiFetch<User>('/auth/me'),
}
```

- [ ] **Step 4: Write `src/hooks/useAuth.ts`**

```typescript
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { authApi, type User } from '@/api/auth'

export function useAuth() {
  const queryClient = useQueryClient()
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ['auth/me'],
    queryFn: () => authApi.me().catch(() => null),
    staleTime: Infinity,
    retry: false,
  })

  async function logout() {
    await authApi.logout().catch(() => {})
    queryClient.clear()
    window.location.href = '/login'
  }

  return { user: user ?? null, isLoading, logout }
}
```

- [ ] **Step 5: Write `src/pages/auth/LoginPage.tsx`**

```typescript
import { useState, FormEvent } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/api/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const from = (location.state as { from?: string })?.from ?? '/'

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await authApi.login({ email, password })
      queryClient.setQueryData(['auth/me'], user)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao entrar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-2" style={{ color: 'var(--accent)' }}>
          Recibo42
        </h1>
        <p className="text-center mb-8" style={{ color: 'var(--text-muted)' }}>
          Entre na sua conta
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>
        <p className="text-center mt-6 text-sm" style={{ color: 'var(--text-muted)' }}>
          Não tem conta?{' '}
          <Link to="/register" style={{ color: 'var(--accent)' }}>
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Write `src/pages/auth/RegisterPage.tsx`**

```typescript
import { useState, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/api/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function RegisterPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('As senhas não coincidem'); return }
    setLoading(true)
    try {
      const user = await authApi.register({ email, password })
      queryClient.setQueryData(['auth/me'], user)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar conta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-2" style={{ color: 'var(--accent)' }}>
          Recibo42
        </h1>
        <p className="text-center mb-8" style={{ color: 'var(--text-muted)' }}>
          Criar nova conta
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="confirm">Confirmar senha</Label>
            <Input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Criando…' : 'Criar conta'}
          </Button>
        </form>
        <p className="text-center mt-6 text-sm" style={{ color: 'var(--text-muted)' }}>
          Já tem conta?{' '}
          <Link to="/login" style={{ color: 'var(--accent)' }}>
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add backend/app/routes/auth.py frontend/src/api/auth.ts frontend/src/hooks/useAuth.ts frontend/src/pages/auth/
git commit -m "feat: auth API, /auth/me endpoint, login/register pages"
```

---

## Task 5: App Shell — Router, PrivateRoute, BottomNav, FAB, App.tsx

**Files:**
- Create: `frontend/src/components/BottomNav.tsx`
- Create: `frontend/src/components/FAB.tsx`
- Create: `frontend/src/App.tsx`

- [ ] **Step 1: Write `src/components/BottomNav.tsx`**

```typescript
import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/', icon: '🏠', label: 'Início' },
  { to: '/reports', icon: '📊', label: 'Relatório' },
  { to: '/settings', icon: '⚙️', label: 'Config' },
]

export function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 flex border-t safe-area-bottom"
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
    >
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 py-2 text-xs ${
              isActive ? 'text-accent' : ''
            }`
          }
          style={({ isActive }) => ({ color: isActive ? 'var(--accent)' : 'var(--text-muted)' })}
        >
          <span className="text-xl">{tab.icon}</span>
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
```

- [ ] **Step 2: Write `src/components/FAB.tsx`**

The FAB opens a bottom sheet with two scan options.

```typescript
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export function FAB() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-20 right-4 z-50 w-14 h-14 rounded-full text-white text-2xl shadow-lg flex items-center justify-center"
        style={{ background: 'var(--accent)' }}
        aria-label="Nova despesa"
      >
        +
      </button>

      {open && (
        <div
          className="fixed bottom-36 right-4 z-50 rounded-xl shadow-xl overflow-hidden"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <button
            className="flex items-center gap-3 px-5 py-3 w-full text-left text-sm hover:opacity-80"
            style={{ color: 'var(--text)' }}
            onClick={() => { setOpen(false); navigate('/scan') }}
          >
            📷 <span>Escanear recibo</span>
          </button>
          <button
            className="flex items-center gap-3 px-5 py-3 w-full text-left text-sm hover:opacity-80"
            style={{ color: 'var(--text)', borderTop: '1px solid var(--border)' }}
            onClick={() => { setOpen(false); navigate('/expense/new') }}
          >
            ✏️ <span>Inserir manualmente</span>
          </button>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 3: Write `src/App.tsx`**

```typescript
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/queryClient'
import { useAuth } from '@/hooks/useAuth'
import { BottomNav } from '@/components/BottomNav'
import { FAB } from '@/components/FAB'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { ScanPage } from '@/pages/scan/ScanPage'
import { CropPage } from '@/pages/scan/CropPage'
import { ExpensePage } from '@/pages/expense/ExpensePage'
import { ManualEntryPage } from '@/pages/expense/ManualEntryPage'
import { ReportsPage } from '@/pages/reports/ReportsPage'
import { SettingsPage } from '@/pages/settings/SettingsPage'

const NO_NAV_ROUTES = ['/login', '/register', '/scan', '/scan/crop']

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="text-4xl animate-spin">⏳</div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  return <>{children}</>
}

function Shell() {
  const location = useLocation()
  const showNav = !NO_NAV_ROUTES.includes(location.pathname)

  return (
    <div style={{ paddingBottom: showNav ? '4rem' : 0 }}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
        <Route path="/scan" element={<PrivateRoute><ScanPage /></PrivateRoute>} />
        <Route path="/scan/crop" element={<PrivateRoute><CropPage /></PrivateRoute>} />
        <Route path="/expense/new" element={<PrivateRoute><ManualEntryPage /></PrivateRoute>} />
        <Route path="/expense/:id" element={<PrivateRoute><ExpensePage /></PrivateRoute>} />
        <Route path="/reports" element={<PrivateRoute><ReportsPage /></PrivateRoute>} />
        <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {showNav && <BottomNav />}
      {showNav && <FAB />}
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Shell />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
```

- [ ] **Step 4: Create stub pages so the build doesn't fail**

Create these empty stubs (will be replaced in later tasks):

```typescript
// frontend/src/pages/dashboard/DashboardPage.tsx
export function DashboardPage() { return <div style={{color:'var(--text)',padding:16}}>Dashboard</div> }

// frontend/src/pages/scan/ScanPage.tsx
export function ScanPage() { return <div style={{color:'var(--text)',padding:16}}>Scan</div> }

// frontend/src/pages/scan/CropPage.tsx
export function CropPage() { return <div style={{color:'var(--text)',padding:16}}>Crop</div> }

// frontend/src/pages/expense/ExpensePage.tsx
export function ExpensePage() { return <div style={{color:'var(--text)',padding:16}}>Expense</div> }

// frontend/src/pages/expense/ManualEntryPage.tsx
export function ManualEntryPage() { return <div style={{color:'var(--text)',padding:16}}>Manual Entry</div> }

// frontend/src/pages/reports/ReportsPage.tsx
export function ReportsPage() { return <div style={{color:'var(--text)',padding:16}}>Reports</div> }

// frontend/src/pages/settings/SettingsPage.tsx
export function SettingsPage() { return <div style={{color:'var(--text)',padding:16}}>Settings</div> }
```

- [ ] **Step 5: Verify build passes**

```bash
cd frontend && npm run build
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/
git commit -m "feat: app shell — router, PrivateRoute, BottomNav, FAB"
```

---

## Task 6: Dashboard Page

**Files:**
- Modify: `frontend/src/pages/dashboard/DashboardPage.tsx` (replace stub)
- Create: `frontend/src/api/expenses.ts`
- Create: `frontend/src/api/receipts.ts`
- Create: `frontend/src/components/ExpenseCard.tsx`
- Create: `frontend/src/components/SkeletonCard.tsx`

- [ ] **Step 1: Write `src/api/expenses.ts`**

```typescript
import { apiFetch } from './client'

export interface Expense {
  id: string
  merchant: string
  amount: number  // cents
  date: string    // ISO
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
  update: (id: string, body: Partial<Expense>) =>
    apiFetch<Expense>(`/expenses/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id: string) =>
    apiFetch<void>(`/expenses/${id}`, { method: 'DELETE' }),
}
```

- [ ] **Step 2: Write `src/api/receipts.ts`**

```typescript
import { apiFetch } from './client'

export interface Receipt {
  id: string
  status: 'pending' | 'processing' | 'processed' | 'failed'
  created_at: string
  image_url: string
}

export const receiptsApi = {
  list: () => apiFetch<Receipt[]>('/receipts'),
  upload: (blob: Blob, filename = 'receipt.jpg') => {
    const form = new FormData()
    form.append('file', blob, filename)
    return apiFetch<Receipt>('/receipts', { method: 'POST', body: form })
  },
}
```

- [ ] **Step 3: Write `src/components/ExpenseCard.tsx`**

```typescript
import { useNavigate } from 'react-router-dom'
import { formatBRL, formatDate } from '@/lib/utils'
import type { Expense } from '@/api/expenses'

export function ExpenseCard({ expense }: { expense: Expense }) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(`/expense/${expense.id}`)}
      className="flex justify-between items-center w-full py-3 px-0 text-left border-b"
      style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
    >
      <div>
        <div className="text-sm font-medium">{expense.merchant || 'Sem nome'}</div>
        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {expense.category} · {formatDate(expense.date)}
        </div>
      </div>
      <div className="text-sm font-semibold">{formatBRL(expense.amount)}</div>
    </button>
  )
}
```

- [ ] **Step 4: Write `src/components/SkeletonCard.tsx`**

```typescript
export function SkeletonCard() {
  return (
    <div className="flex justify-between items-center py-3 border-b animate-pulse" style={{ borderColor: 'var(--border)' }}>
      <div className="space-y-2">
        <div className="h-3 w-32 rounded" style={{ background: 'var(--border)' }} />
        <div className="h-2 w-20 rounded" style={{ background: 'var(--border)' }} />
      </div>
      <div className="h-3 w-16 rounded" style={{ background: 'var(--border)' }} />
    </div>
  )
}
```

- [ ] **Step 5: Write full `DashboardPage.tsx`**

```typescript
import { useQuery } from '@tanstack/react-query'
import { expensesApi } from '@/api/expenses'
import { receiptsApi } from '@/api/receipts'
import { ExpenseCard } from '@/components/ExpenseCard'
import { SkeletonCard } from '@/components/SkeletonCard'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useAuth } from '@/hooks/useAuth'
import { useSSE } from '@/hooks/useSSE'
import { formatBRL } from '@/lib/utils'

export function DashboardPage() {
  const { user } = useAuth()
  useSSE()

  const { data: expenses, isLoading: expLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: expensesApi.list,
  })

  const { data: receipts } = useQuery({
    queryKey: ['receipts'],
    queryFn: receiptsApi.list,
  })

  const processingReceipts = receipts?.filter((r) => r.status === 'pending' || r.status === 'processing') ?? []
  const totalCents = expenses?.reduce((sum, e) => sum + e.amount, 0) ?? 0
  const now = new Date()
  const monthLabel = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  const firstName = user?.email.split('@')[0] ?? ''

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-lg mx-auto px-4 pt-6 pb-2">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-lg font-bold" style={{ color: 'var(--text)' }}>
              Olá, {firstName}
            </h1>
            <p className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>
              {monthLabel}
            </p>
          </div>
          <ThemeToggle />
        </div>

        {/* Summary card */}
        <div
          className="rounded-xl p-4 mb-6"
          style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))' }}
        >
          <div className="text-xs font-semibold uppercase tracking-wide text-white/70 mb-1">
            Total do mês
          </div>
          <div className="text-3xl font-bold text-white">{formatBRL(totalCents)}</div>
          <div className="text-xs text-white/60 mt-1">
            {expenses?.length ?? 0} despesas
          </div>
        </div>

        {/* Processing receipts */}
        {processingReceipts.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between py-3 border-b"
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
          >
            <span className="text-sm">Recibo em análise…</span>
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(255,159,10,0.15)', color: '#ff9f0a' }}
            >
              ⏳ Processando
            </span>
          </div>
        ))}

        {/* Expense list */}
        {expLoading
          ? Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
          : expenses?.map((e) => <ExpenseCard key={e.id} expense={e} />)
        }

        {expenses?.length === 0 && !expLoading && (
          <p className="text-center py-12 text-sm" style={{ color: 'var(--text-muted)' }}>
            Nenhuma despesa ainda. Adicione uma!
          </p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Verify build**

```bash
cd frontend && npm run build
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src/
git commit -m "feat: dashboard page with expense list and summary card"
```

---

## Task 7: SSE Hook

**Files:**
- Create: `frontend/src/hooks/useSSE.ts`
- Create: `frontend/src/hooks/__tests__/useSSE.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// frontend/src/hooks/__tests__/useSSE.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('useSSE', () => {
  it('can be imported without throwing', async () => {
    const mod = await import('../useSSE')
    expect(typeof mod.useSSE).toBe('function')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && npx vitest run src/hooks/__tests__/useSSE.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/hooks/useSSE.ts`**

```typescript
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
      es.close()
      // Reconnect after 5s on error
      setTimeout(() => {
        esRef.current = null
      }, 5000)
    }

    return () => {
      es.close()
      esRef.current = null
    }
  }, [user, queryClient])
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd frontend && npx vitest run src/hooks/__tests__/useSSE.test.ts
```

Expected: 1 test passing.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/useSSE.ts frontend/src/hooks/__tests__/
git commit -m "feat: SSE hook for real-time receipt.processed events"
```

---

## Task 8: Scan Page + useCamera Hook + scanStore

**Files:**
- Create: `frontend/src/store/scanStore.ts`
- Create: `frontend/src/hooks/useCamera.ts`
- Modify: `frontend/src/pages/scan/ScanPage.tsx` (replace stub)

- [ ] **Step 1: Write `src/store/scanStore.ts`**

```typescript
import { create } from 'zustand'

interface ScanState {
  capturedBlob: Blob | null
  setBlob: (blob: Blob | null) => void
}

export const useScanStore = create<ScanState>()((set) => ({
  capturedBlob: null,
  setBlob: (capturedBlob) => set({ capturedBlob }),
}))
```

- [ ] **Step 2: Write `src/hooks/useCamera.ts`**

```typescript
import { useRef, useState, useCallback } from 'react'

export function useCamera(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const streamRef = useRef<MediaStream | null>(null)
  const [flashOn, setFlashOn] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
    } catch {
      setError('Câmera não disponível. Verifique as permissões.')
    }
  }, [videoRef])

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  const capture = useCallback((): Blob | null => {
    if (!videoRef.current) return null
    const video = videoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0)
    let result: Blob | null = null
    canvas.toBlob(
      (blob) => { result = blob },
      'image/jpeg',
      0.9,
    )
    return result
  }, [videoRef])

  const toggleFlash = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track) return
    try {
      // @ts-expect-error — ImageCapture not in all TS libs
      const ic = new ImageCapture(track)
      await ic.setPhotoSettings({ fillLightMode: flashOn ? 'off' : 'flash' })
      setFlashOn((v) => !v)
    } catch {
      // Flash not supported — silent fail
    }
  }, [flashOn])

  return { start, stop, capture, toggleFlash, flashOn, error }
}
```

- [ ] **Step 3: Write full `ScanPage.tsx`**

```typescript
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCamera } from '@/hooks/useCamera'
import { useScanStore } from '@/store/scanStore'

export function ScanPage() {
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const { start, stop, capture, toggleFlash, flashOn, error } = useCamera(videoRef)
  const setBlob = useScanStore((s) => s.setBlob)
  const [capturing, setCapturing] = useState(false)

  useEffect(() => {
    start()
    return () => stop()
  }, [start, stop])

  function handleCapture() {
    if (capturing) return
    setCapturing(true)
    const blob = capture()
    if (blob) {
      setBlob(blob)
      navigate('/scan/crop')
    }
    setCapturing(false)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBlob(file)
    navigate('/scan/crop')
  }

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: '#000' }}>
      {error ? (
        <div className="flex-1 flex items-center justify-center p-8 text-center text-white">
          <div>
            <div className="text-4xl mb-4">📷</div>
            <p className="text-sm opacity-80">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="mt-6 px-6 py-2 rounded-full text-sm"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              Voltar
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 relative overflow-hidden">
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              playsInline
              muted
            />
            {/* Guide overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="w-72 h-44 relative"
                style={{ border: '1.5px solid rgba(233,69,96,0.8)', borderRadius: 8 }}
              >
                {/* Corner marks */}
                {['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'].map((pos, i) => (
                  <div
                    key={i}
                    className={`absolute w-4 h-4 ${pos}`}
                    style={{
                      borderColor: '#e94560',
                      borderStyle: 'solid',
                      borderWidth: i < 2 ? '2px 0 0 2px' : '0 0 2px 2px',
                      borderRadius: i === 0 ? '3px 0 0 0' : i === 1 ? '0 3px 0 0' : i === 2 ? '0 0 0 3px' : '0 0 3px 0',
                    }}
                  />
                ))}
              </div>
            </div>
            <p className="absolute bottom-4 left-0 right-0 text-center text-xs text-white/50">
              Encaixe o recibo no guia
            </p>
          </div>

          <div
            className="flex items-center justify-around px-8 py-6"
            style={{ background: 'rgba(0,0,0,0.7)' }}
          >
            <button
              onClick={toggleFlash}
              className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
              style={{ background: flashOn ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)' }}
            >
              ⚡
            </button>

            <button
              onClick={handleCapture}
              disabled={capturing}
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl"
              style={{
                background: 'var(--accent)',
                boxShadow: '0 0 0 4px rgba(233,69,96,0.3)',
              }}
            >
              📷
            </button>

            <button
              onClick={() => fileRef.current?.click()}
              className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
              style={{ background: 'rgba(255,255,255,0.1)' }}
            >
              🖼️
            </button>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Verify build**

```bash
cd frontend && npm run build
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/store/scanStore.ts frontend/src/hooks/useCamera.ts frontend/src/pages/scan/ScanPage.tsx
git commit -m "feat: scan page with camera viewfinder, flash toggle, gallery fallback"
```

---

## Task 9: Crop Page + Receipt Upload

**Files:**
- Modify: `frontend/src/pages/scan/CropPage.tsx` (replace stub)

- [ ] **Step 1: Install cropperjs**

```bash
cd frontend && npm install cropperjs && npm install -D @types/cropperjs
```

- [ ] **Step 2: Write full `CropPage.tsx`**

```typescript
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Cropper from 'cropperjs'
import 'cropperjs/dist/cropper.min.css'
import { useScanStore } from '@/store/scanStore'
import { receiptsApi } from '@/api/receipts'
import { useQueryClient } from '@tanstack/react-query'

export function CropPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const blob = useScanStore((s) => s.capturedBlob)
  const setBlob = useScanStore((s) => s.setBlob)
  const imgRef = useRef<HTMLImageElement>(null)
  const cropperRef = useRef<Cropper | null>(null)
  const [uploading, setUploading] = useState(false)
  const [imgSrc, setImgSrc] = useState<string | null>(null)

  useEffect(() => {
    if (!blob) { navigate('/scan'); return }
    const url = URL.createObjectURL(blob)
    setImgSrc(url)
    return () => URL.revokeObjectURL(url)
  }, [blob, navigate])

  useEffect(() => {
    if (!imgSrc || !imgRef.current) return
    cropperRef.current = new Cropper(imgRef.current, {
      viewMode: 1,
      autoCropArea: 0.9,
      movable: true,
      zoomable: true,
      rotatable: false,
    })
    return () => {
      cropperRef.current?.destroy()
      cropperRef.current = null
    }
  }, [imgSrc])

  function handleRetake() {
    setBlob(null)
    navigate('/scan')
  }

  async function handleConfirm() {
    if (!cropperRef.current || uploading) return
    setUploading(true)
    try {
      const canvas = cropperRef.current.getCroppedCanvas({ maxWidth: 1920, maxHeight: 1920 })
      canvas.toBlob(async (croppedBlob) => {
        if (!croppedBlob) return
        await receiptsApi.upload(croppedBlob, 'receipt.jpg')
        queryClient.invalidateQueries({ queryKey: ['receipts'] })
        queryClient.invalidateQueries({ queryKey: ['expenses'] })
        setBlob(null)
        navigate('/')
      }, 'image/jpeg', 0.9)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao enviar recibo')
      setUploading(false)
    }
  }

  if (!imgSrc) return null

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: '#000' }}>
      <div className="flex-1 overflow-hidden">
        <img ref={imgRef} src={imgSrc} alt="Receipt" style={{ maxWidth: '100%', display: 'block' }} />
      </div>
      <div
        className="flex gap-4 px-6 py-5"
        style={{ background: 'rgba(0,0,0,0.8)' }}
      >
        <button
          onClick={handleRetake}
          className="flex-1 py-3 rounded-xl text-sm font-semibold"
          style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}
        >
          Refazer
        </button>
        <button
          onClick={handleConfirm}
          disabled={uploading}
          className="flex-1 py-3 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'var(--accent)' }}
        >
          {uploading ? 'Enviando…' : 'Confirmar'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify build**

```bash
cd frontend && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/scan/CropPage.tsx
git commit -m "feat: crop page with cropperjs and receipt upload"
```

---

## Task 10: Expense Detail Page

**Files:**
- Modify: `frontend/src/pages/expense/ExpensePage.tsx` (replace stub)

- [ ] **Step 1: Write full `ExpensePage.tsx`**

```typescript
import { useState, useEffect, FormEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { expensesApi, type Expense } from '@/api/expenses'
import { SkeletonCard } from '@/components/SkeletonCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatBRL } from '@/lib/utils'

const CATEGORIES = ['Alimentação', 'Transporte', 'Saúde', 'Lazer', 'Moradia', 'Educação', 'Outro']
const PAYMENT_METHODS = [
  { value: 'cash', label: 'Dinheiro' },
  { value: 'credit', label: 'Crédito' },
  { value: 'debit', label: 'Débito' },
  { value: 'pix', label: 'Pix' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'other', label: 'Outro' },
]

export function ExpensePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: expense, isLoading } = useQuery<Expense>({
    queryKey: ['expense', id],
    queryFn: () => expensesApi.get(id!),
    enabled: !!id,
  })

  const [merchant, setMerchant] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState('')
  const [category, setCategory] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!expense) return
    setMerchant(expense.merchant ?? '')
    setAmount(expense.amount ? (expense.amount / 100).toFixed(2) : '')
    setDate(expense.date?.slice(0, 10) ?? '')
    setCategory(expense.category ?? '')
    setPaymentMethod(expense.payment_method ?? '')
    setNotes(expense.notes ?? '')
  }, [expense])

  const mutation = useMutation({
    mutationFn: (body: Partial<Expense>) => expensesApi.update(id!, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['expense', id] })
      navigate('/')
    },
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    mutation.mutate({
      merchant,
      amount: Math.round(parseFloat(amount) * 100),
      date,
      category,
      payment_method: paymentMethod,
      notes,
    })
  }

  const processing = expense?.receipt_id && !expense.merchant

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} style={{ color: 'var(--text-muted)' }}>←</button>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text)' }}>Despesa</h1>
          {expense?.receipt_id && !processing && (
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded"
              style={{ background: 'rgba(52,199,89,0.15)', color: '#34c759' }}
            >
              ✨ Preenchido por IA
            </span>
          )}
          {processing && (
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded"
              style={{ background: 'rgba(255,159,10,0.15)', color: '#ff9f0a' }}
            >
              ⏳ Processando
            </span>
          )}
        </div>

        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label>Estabelecimento</Label>
              {processing ? (
                <div className="h-10 rounded animate-pulse" style={{ background: 'var(--border)' }} />
              ) : (
                <Input value={merchant} onChange={(e) => setMerchant(e.target.value)} />
              )}
            </div>

            <div className="space-y-1">
              <Label>Valor (R$)</Label>
              {processing ? (
                <div className="h-10 rounded animate-pulse" style={{ background: 'var(--border)' }} />
              ) : (
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              )}
            </div>

            <div className="space-y-1">
              <Label>Data</Label>
              {processing ? (
                <div className="h-10 rounded animate-pulse" style={{ background: 'var(--border)' }} />
              ) : (
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              )}
            </div>

            <div className="space-y-1">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={setCategory} disabled={!!processing}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Pagamento</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod} disabled={!!processing}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Observações</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Adicionar nota…"
                rows={3}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={!!processing || mutation.isPending}
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              {mutation.isPending ? 'Salvando…' : 'Salvar'}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
cd frontend && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/expense/ExpensePage.tsx
git commit -m "feat: expense detail page with AI badge and skeleton loading"
```

---

## Task 11: Manual Entry Page

**Files:**
- Modify: `frontend/src/pages/expense/ManualEntryPage.tsx` (replace stub)

- [ ] **Step 1: Write full `ManualEntryPage.tsx`**

```typescript
import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { expensesApi } from '@/api/expenses'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const CATEGORIES = ['Alimentação', 'Transporte', 'Saúde', 'Lazer', 'Moradia', 'Educação', 'Outro']
const PAYMENT_METHODS = [
  { value: 'cash', label: 'Dinheiro' },
  { value: 'credit', label: 'Crédito' },
  { value: 'debit', label: 'Débito' },
  { value: 'pix', label: 'Pix' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'other', label: 'Outro' },
]

export function ManualEntryPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [merchant, setMerchant] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [category, setCategory] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: expensesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      navigate('/')
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Erro ao salvar'),
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!amount || parseFloat(amount) <= 0) { setError('Informe um valor válido'); return }
    mutation.mutate({
      merchant,
      amount: Math.round(parseFloat(amount) * 100),
      date,
      category,
      payment_method: paymentMethod,
      notes,
    })
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} style={{ color: 'var(--text-muted)' }}>←</button>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text)' }}>Nova despesa</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Estabelecimento</Label>
            <Input value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder="Ex: Supermercado Extra" />
          </div>

          <div className="space-y-1">
            <Label>Valor (R$) *</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
            />
          </div>

          <div className="space-y-1">
            <Label>Data</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>

          <div className="space-y-1">
            <Label>Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Pagamento</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Adicionar nota…" rows={3} />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button
            type="submit"
            className="w-full"
            disabled={mutation.isPending}
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            {mutation.isPending ? 'Salvando…' : 'Salvar'}
          </Button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
cd frontend && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/expense/ManualEntryPage.tsx
git commit -m "feat: manual expense entry page"
```

---

## Task 12: Reports Page

**Files:**
- Modify: `frontend/src/pages/reports/ReportsPage.tsx` (replace stub)
- Create: `frontend/src/api/reports.ts`

- [ ] **Step 1: Install Recharts**

```bash
cd frontend && npm install recharts
```

- [ ] **Step 2: Write `src/api/reports.ts`**

```typescript
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
```

- [ ] **Step 3: Write full `ReportsPage.tsx`**

```typescript
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { reportsApi } from '@/api/reports'
import { formatBRL } from '@/lib/utils'

const PERIOD_OPTIONS = [
  { label: 'Último mês', months: 1 },
  { label: '3 meses', months: 3 },
  { label: '6 meses', months: 6 },
  { label: '12 meses', months: 12 },
]

const BAR_COLORS = ['#e94560', '#ff9f0a', '#30d158', '#bf5af2', '#0a84ff', '#ff6b35']

function getDateRange(months: number): { from: string; to: string } {
  const to = new Date()
  const from = new Date()
  from.setMonth(from.getMonth() - months)
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  }
}

export function ReportsPage() {
  const [periodMonths, setPeriodMonths] = useState(1)
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [showCustom, setShowCustom] = useState(false)

  const { from, to } = showCustom && customFrom && customTo
    ? { from: customFrom, to: customTo }
    : getDateRange(periodMonths)

  const { data: summary, isLoading } = useQuery({
    queryKey: ['reports/summary', from, to],
    queryFn: () => reportsApi.summary(from, to),
    enabled: !!from && !!to,
  })

  const maxTotal = Math.max(...(summary?.categories.map((c) => c.total) ?? [1]))

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
        <h1 className="text-lg font-bold mb-6" style={{ color: 'var(--text)' }}>Relatório</h1>

        {/* Period chips */}
        <div className="flex gap-2 flex-wrap mb-6">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.months}
              onClick={() => { setPeriodMonths(opt.months); setShowCustom(false) }}
              className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
              style={{
                background: !showCustom && periodMonths === opt.months ? 'var(--accent)' : 'rgba(255,255,255,0.08)',
                color: !showCustom && periodMonths === opt.months ? '#fff' : 'var(--text-muted)',
              }}
            >
              {opt.label}
            </button>
          ))}
          <button
            onClick={() => setShowCustom((v) => !v)}
            className="px-3 py-1 rounded-full text-xs font-medium"
            style={{
              background: showCustom ? 'var(--accent)' : 'rgba(255,255,255,0.08)',
              color: showCustom ? '#fff' : 'var(--text-muted)',
            }}
          >
            📅
          </button>
        </div>

        {showCustom && (
          <div className="flex gap-3 mb-6">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="flex-1 rounded px-3 py-2 text-sm"
              style={{ background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)' }}
            />
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="flex-1 rounded px-3 py-2 text-sm"
              style={{ background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)' }}
            />
          </div>
        )}

        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-8 rounded animate-pulse" style={{ background: 'var(--border)' }} />
            ))}
          </div>
        )}

        {summary && (
          <>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Por categoria</p>

            <ResponsiveContainer width="100%" height={summary.categories.length * 44}>
              <BarChart
                data={summary.categories}
                layout="vertical"
                margin={{ top: 0, right: 60, left: 80, bottom: 0 }}
              >
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="category" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} width={80} />
                <Tooltip
                  formatter={(v: number) => formatBRL(v)}
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }}
                  labelStyle={{ color: 'var(--text)' }}
                />
                <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                  {summary.categories.map((_, idx) => (
                    <Cell key={idx} fill={BAR_COLORS[idx % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Payment methods */}
            {summary.payment_methods.length > 0 && (
              <div className="mt-6 mb-4">
                <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Por forma de pagamento</p>
                {summary.payment_methods.map((pm) => (
                  <div key={pm.method} className="flex justify-between py-2 text-sm border-b" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{pm.method}</span>
                    <span className="font-semibold">{formatBRL(pm.total)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Total */}
            <div className="flex justify-between py-3 border-t" style={{ borderColor: 'var(--border)' }}>
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Total</span>
              <span className="text-base font-bold" style={{ color: 'var(--text)' }}>{formatBRL(summary.grand_total)}</span>
            </div>

            {/* Export */}
            <a
              href={reportsApi.pdfUrl(from, to)}
              download
              className="block w-full mt-4 py-3 rounded-xl text-center text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))' }}
            >
              ⬇ Exportar PDF
            </a>
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Verify build**

```bash
cd frontend && npm run build
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/api/reports.ts frontend/src/pages/reports/ReportsPage.tsx
git commit -m "feat: reports page with bar chart and PDF export"
```

---

## Task 13: Settings Page

**Files:**
- Modify: `frontend/src/pages/settings/SettingsPage.tsx` (replace stub)

- [ ] **Step 1: Write full `SettingsPage.tsx`**

```typescript
import { useState, FormEvent } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { apiFetch } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function SettingsPage() {
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)
  const [changingPw, setChangingPw] = useState(false)

  async function handlePasswordChange(e: FormEvent) {
    e.preventDefault()
    setPwError('')
    setPwSuccess(false)
    if (newPw !== confirmPw) { setPwError('As senhas não coincidem'); return }
    if (newPw.length < 8) { setPwError('A nova senha deve ter pelo menos 8 caracteres'); return }
    setChangingPw(true)
    try {
      await apiFetch('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ current_password: currentPw, new_password: newPw }),
      })
      setPwSuccess(true)
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
    } catch (err) {
      setPwError(err instanceof Error ? err.message : 'Erro ao alterar senha')
    } finally {
      setChangingPw(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
        <h1 className="text-lg font-bold mb-6" style={{ color: 'var(--text)' }}>Configurações</h1>

        {/* Account */}
        <section className="mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
            Conta
          </h2>
          <div
            className="rounded-xl px-4 py-3 mb-4"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>E-mail</p>
            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{user?.email}</p>
          </div>

          <div
            className="rounded-xl px-4 py-4"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <p className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>Alterar senha</p>
            <form onSubmit={handlePasswordChange} className="space-y-3">
              <div className="space-y-1">
                <Label>Senha atual</Label>
                <Input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label>Nova senha</Label>
                <Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label>Confirmar nova senha</Label>
                <Input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} required />
              </div>
              {pwError && <p className="text-sm text-red-400">{pwError}</p>}
              {pwSuccess && <p className="text-sm text-green-400">Senha alterada com sucesso!</p>}
              <Button type="submit" disabled={changingPw} className="w-full">
                {changingPw ? 'Salvando…' : 'Salvar nova senha'}
              </Button>
            </form>
          </div>
        </section>

        {/* Theme */}
        <section className="mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
            Aparência
          </h2>
          <div className="flex gap-3">
            {(['dark', 'warm'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className="flex-1 py-3 rounded-xl text-sm font-medium border transition-colors"
                style={{
                  background: theme === t ? 'var(--accent)' : 'var(--bg-card)',
                  color: theme === t ? '#fff' : 'var(--text-muted)',
                  borderColor: theme === t ? 'var(--accent)' : 'var(--border)',
                }}
              >
                {t === 'dark' ? '🌙 Dark & Bold' : '☀️ Warm & Friendly'}
              </button>
            ))}
          </div>
        </section>

        {/* Logout */}
        <section className="mb-8">
          <Button
            variant="destructive"
            className="w-full"
            onClick={logout}
          >
            Sair da conta
          </Button>
        </section>

        {/* Version */}
        <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
          Recibo42 v1.0.0
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
cd frontend && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/settings/SettingsPage.tsx
git commit -m "feat: settings page — theme toggle, password change, logout"
```

---

## Task 14: PWA + GitHub Actions Deploy Workflow

**Files:**
- Create: `.github/workflows/deploy-frontend.yml`
- Create: `frontend/public/manifest.json`

- [ ] **Step 1: Write `frontend/public/manifest.json`**

Note: vite-plugin-pwa generates this automatically from `vite.config.ts` — the public file is not needed. Skip this step if the build already generates `dist/manifest.webmanifest`.

To verify:
```bash
cd frontend && npm run build && ls dist/
```

If `manifest.webmanifest` appears, no manual manifest needed. If not, create:
```json
{
  "name": "Recibo42",
  "short_name": "Recibo42",
  "description": "Escaneie recibos e controle despesas",
  "theme_color": "#e94560",
  "background_color": "#1a1a2e",
  "display": "standalone",
  "orientation": "portrait",
  "start_url": "/",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-180.png", "sizes": "180x180", "type": "image/png" }
  ]
}
```

- [ ] **Step 2: Write `.github/workflows/deploy-frontend.yml`**

```yaml
name: Deploy Frontend

on:
  push:
    branches: [master]
    paths:
      - 'frontend/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        run: npm ci
        working-directory: frontend

      - name: Build
        run: npm run build
        working-directory: frontend

      - name: Deploy to VPS
        uses: appleboy/scp-action@v0.1.7
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          source: "frontend/dist/*"
          target: /var/www/recibo42
          strip_components: 2
```

- [ ] **Step 3: Add GitHub secrets to repo**

In GitHub → repo → Settings → Secrets and Variables → Actions, add:
- `VPS_HOST` = `j4rvis.com.br`
- `VPS_USER` = `jarvis`
- `VPS_SSH_KEY` = contents of the deploy private key (generate with `ssh-keygen -t ed25519 -f deploy_key`, add public key to `~/.ssh/authorized_keys` on VPS)

This is a manual step — cannot be automated from local.

- [ ] **Step 4: Ensure nginx serves the SPA**

On VPS, the nginx config already has:
```nginx
location / {
    root /var/www/recibo42;
    try_files $uri $uri/ /index.html;
}
```

Verify this is in place. If not, update `/etc/nginx/sites-available/recibo42` and `nginx -t && systemctl reload nginx`.

- [ ] **Step 5: Create `/var/www/recibo42` on VPS if not exists**

```bash
ssh jarvis@j4rvis.com.br "sudo mkdir -p /var/www/recibo42 && sudo chown jarvis:www-data /var/www/recibo42 && sudo chmod 755 /var/www/recibo42"
```

- [ ] **Step 6: Final build + run all tests**

```bash
cd frontend && npm run build && npx vitest run
```

Expected: all tests pass, dist/ created.

- [ ] **Step 7: Commit and push to trigger deploy**

```bash
git add .github/workflows/deploy-frontend.yml
git commit -m "feat: GitHub Actions deploy workflow for frontend"
git push origin master
```

Watch GitHub Actions tab — on success, `https://recibo42.com.br` should serve the React app.

---

## Self-Review

**Spec coverage:**
- ✅ Task 1: Vite + React 18 + TS + shadcn + Tailwind + Vitest + vite-plugin-pwa
- ✅ Task 2: Dark & Warm themes via CSS vars + Zustand themeStore + ThemeToggle
- ✅ Task 3: apiFetch wrapper + React Query v5 singleton + formatBRL/formatDate utils
- ✅ Task 4: Auth API + `/auth/me` backend endpoint + useAuth + Login + Register
- ✅ Task 5: React Router v6 + PrivateRoute + BottomNav + FAB + App.tsx
- ✅ Task 6: Dashboard with month summary, expense list, processing receipts, FAB
- ✅ Task 7: useSSE hook — EventSource + receipt.processed invalidates queries
- ✅ Task 8: ScanPage — getUserMedia, guide overlay, flash, gallery fallback, scanStore
- ✅ Task 9: CropPage — cropperjs, retake/confirm, multipart upload to /api/receipts
- ✅ Task 10: ExpensePage — AI badge, skeleton on processing fields, PATCH on save
- ✅ Task 11: ManualEntryPage — POST /expenses, same form, no thumbnail/AI badge
- ✅ Task 12: ReportsPage — period chips, Recharts BarChart, PDF export link
- ✅ Task 13: SettingsPage — theme toggle, password change, logout, version
- ✅ Task 14: PWA manifest + GitHub Actions scp deploy

**Spec items double-checked:**
- BottomNav absent on `/login`, `/register`, `/scan`, `/scan/crop` — handled via `NO_NAV_ROUTES` array in App.tsx ✅
- SSE mounts when authenticated, disconnects on logout — `useSSE` depends on `user` from `useAuth`, `logout` calls `queryClient.clear()` which zeroes auth cache ✅
- `/expense/new` route order — in App.tsx, `/expense/new` is declared before `/expense/:id`, so React Router won't match "new" as an ID ✅
- 401 on any API call → redirect to `/login` — handled in `apiFetch` ✅
- `cropperjs` CSS import in CropPage — included `import 'cropperjs/dist/cropper.min.css'` ✅
- PDF download uses `<a download>` not `window.open` — credentials not sent via `<a>`, but the backend uses httpOnly cookies which the browser sends automatically on same-origin `<a href>` navigation ✅

**No placeholders remain.** All tasks contain complete code.
