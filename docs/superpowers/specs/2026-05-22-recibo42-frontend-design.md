# Recibo42 Frontend — Design Spec

**Date:** 2026-05-22
**Scope:** V1 React PWA — login through reports, full camera scan flow, two themes, GitHub Actions deploy

---

## 1. Overview

Mobile-first React PWA that connects to the existing Recibo42 backend at `recibo42.com.br/api/`. Core flow: authenticate → scan receipt with in-browser camera → AI extracts expense fields → review/edit → view reports → export PDF.

---

## 2. Tech Stack

| Concern | Choice |
|---|---|
| Framework | React 18 + Vite + TypeScript |
| UI components | shadcn/ui + Tailwind CSS |
| Routing | React Router v6 |
| Server state | TanStack Query (React Query v5) |
| UI state | Zustand |
| Camera | `MediaDevices.getUserMedia` + `ImageCapture` API |
| Image cropping | cropperjs |
| Charts | Recharts |
| PWA | vite-plugin-pwa (service worker + manifest) |
| Deploy | GitHub Actions → scp → `/var/www/recibo42` |

---

## 3. Theme System

Two themes via CSS custom properties:

- **Dark & Bold** (default): dark navy background (`#1a1a2e`), red/coral accent (`#e94560`)
- **Warm & Friendly** (light): white background, amber/orange accent (`#ff6b35`)

Implementation: `:root` holds dark theme variables; `[data-theme="warm"]` on `<html>` overrides to warm palette. Zustand `useTheme` hook persists selection to `localStorage`. Toggle available in Settings page and as an icon in the Dashboard header.

All shadcn/ui components reference Tailwind CSS variables — no hardcoded colors in component code.

---

## 4. Project Structure

```
frontend/
  src/
    api/
      auth.ts          # login, register, logout, refresh
      expenses.ts      # CRUD
      receipts.ts      # upload, list
      reports.ts       # summary, pdf download
    components/
      BottomNav.tsx
      FAB.tsx          # floating action button (+ Novo)
      ExpenseCard.tsx
      SkeletonCard.tsx
      ThemeToggle.tsx
      Toast.tsx
    pages/
      auth/
        LoginPage.tsx
        RegisterPage.tsx
      dashboard/
        DashboardPage.tsx
      scan/
        ScanPage.tsx    # camera viewfinder
        CropPage.tsx    # cropperjs overlay
      expense/
        ExpensePage.tsx       # detail + edit (AI or manual)
        ManualEntryPage.tsx   # blank form, no receipt
      reports/
        ReportsPage.tsx
      settings/
        SettingsPage.tsx
    hooks/
      useSSE.ts         # SSE connection + event dispatch
      useCamera.ts      # getUserMedia, flash, ImageCapture
      useAuth.ts        # current user, logout
      useTheme.ts       # dark/warm toggle, localStorage
    lib/
      queryClient.ts    # TanStack Query singleton
      utils.ts          # cn(), formatBRL(), formatDate()
    App.tsx             # router + providers
    main.tsx
  public/
    manifest.json       # PWA manifest
    icons/              # 512×512, 192×192, 180×180 (iOS)
  index.html
  vite.config.ts
  tailwind.config.ts
  tsconfig.json
```

---

## 5. Routing

```
/login                  → LoginPage        (public)
/register               → RegisterPage     (public)
/                       → DashboardPage    (auth-gated)
/scan                   → ScanPage         (auth-gated)
/scan/crop              → CropPage         (auth-gated)
/expense/:id            → ExpensePage      (auth-gated)
/expense/new            → ManualEntryPage  (auth-gated)
/reports                → ReportsPage      (auth-gated)
/settings               → SettingsPage     (auth-gated)
```

Unauthenticated requests to auth-gated routes redirect to `/login`. After login, redirect back to the originally requested route.

`BottomNav` renders on all auth-gated routes. It is absent on `/login`, `/register`, `/scan`, `/scan/crop` (full-screen experiences).

---

## 6. Screens

### Login / Register
Standard email + password form. Register shows password confirmation. Error messages in pt-BR below each field. On success → redirect to `/`.

### Dashboard (Início)
- Month summary card: total spent + receipt count
- Expense list, reverse-chronological
- Processing receipts shown at top with amber "⏳ Processando…" pill
- FAB (`+`) opens bottom sheet: "Escanear recibo" → `/scan` | "Inserir manualmente" → `/expense/new`
- SSE event `receipt.processed`: invalidates `['expenses']` and `['receipts']` queries, shows success toast, processing pill flips to expense row without page refresh

### Scan (ScanPage)
- Full-screen `<video>` element via `getUserMedia({ video: { facingMode: 'environment' } })`
- Guide overlay: red corner marks to frame the receipt
- Controls row: flash toggle (⚡) | capture button | gallery button (opens `<input type="file">`)
- Capture: canvas snapshot → Blob → stored in Zustand `scanStore` → navigate to `/scan/crop`
- iOS Safari note: `getUserMedia` requires HTTPS (already satisfied by nginx + Let's Encrypt)

### Crop (CropPage)
- cropperjs on `<img>` loaded from Zustand `scanStore.capturedBlob`
- "Refazer" → back to `/scan`, clears blob
- "Confirmar" → `canvas.toBlob()` → `POST /api/receipts` multipart → navigate to `/` on 202 response
- Receipt appears on Dashboard with "Processando…" pill immediately

### Expense detail (ExpensePage)
- Receipt thumbnail at top (from `/api/receipts/:id` image URL) — hidden for manual entries
- Fields: Estabelecimento · Data · Valor (R$) · Pagamento (select) · Categoria (select) · Observações (textarea)
- AI badge: `✨ Preenchido por IA` (green) when `receipt.status === 'processed'`
- Processing state: skeleton loaders on AI fields, Save button disabled; notes field always enabled
- On SSE `receipt.processed` for this receipt: React Query refetch, fields animate in, Save enables
- Save → `PATCH /api/expenses/:id` → toast + navigate to `/`

### Manual Entry (ManualEntryPage)
- Same form as ExpensePage, all fields empty, no thumbnail, no AI badge
- Save → `POST /api/expenses` → toast + navigate to `/`

### Reports (ReportsPage)
- Period chips: Último mês · 3 meses · 6 meses · 12 meses · 📅 (date picker)
- Recharts `BarChart` for category breakdown (horizontal bars, one color per category)
- Payment method totals as a simple list below the chart
- Grand total line
- "⬇ Exportar PDF" → `GET /api/reports/pdf?from_date=…&to_date=…` → browser download (Content-Disposition: attachment)

### Settings (SettingsPage)
- Account section: email display, "Alterar senha" (password change form inline)
- Theme toggle: Dark & Bold / Warm & Friendly
- App version display

---

## 7. Data Flow

### API wrappers (`src/api/`)
Typed `fetch` wrappers. All requests go to `/api/` (same origin — nginx proxies). Credentials mode: `include` (httpOnly cookies). On 401: clear React Query cache + redirect to `/login`.

### React Query
- `useQuery(['expenses'], fetchExpenses)` — Dashboard list
- `useQuery(['receipts'], fetchReceipts)` — Dashboard processing receipts
- `useQuery(['expense', id], fetchExpense)` — ExpensePage
- `useQuery(['reports/summary', from, to], fetchSummary)` — ReportsPage
- `useMutation` for create/update/delete + `queryClient.invalidateQueries` on success

### SSE (`useSSE`)
Connects to `/api/events` with `EventSource` (credentials: include via fetch-based polyfill or native). On `receipt.processed`:
```ts
queryClient.invalidateQueries({ queryKey: ['expenses'] })
queryClient.invalidateQueries({ queryKey: ['receipts'] })
toast.success('Recibo processado!')
```
Hook mounts in `App.tsx` when authenticated. Disconnects on logout.

---

## 8. Camera Implementation Notes

- `getUserMedia` constraints: `{ video: { facingMode: 'environment', width: { ideal: 1920 } } }`
- Flash: `ImageCapture.setPhotoSettings({ fillLightMode: 'flash' })` — graceful fallback if unsupported
- Gallery fallback: hidden `<input type="file" accept="image/*" capture="environment">` — triggers native picker
- iOS 16+: `getUserMedia` works in Safari with HTTPS. `ImageCapture` API partially supported — use canvas snapshot fallback for capture.
- Android Chrome: full support

---

## 9. PWA

`vite-plugin-pwa` config:
- `registerType: 'autoUpdate'`
- Precache: all JS/CSS/HTML assets
- Runtime cache: API responses excluded (always fresh)
- `manifest.json`: name "Recibo42", short_name "Recibo42", theme_color `#e94560`, background_color `#1a1a2e`, display `standalone`, orientation `portrait`
- Icons: 512×512, 192×192 (maskable), 180×180 (Apple touch icon)

---

## 10. GitHub Actions Deploy

File: `.github/workflows/deploy-frontend.yml`

```yaml
on:
  push:
    branches: [master]
    paths: [frontend/**]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm', cache-dependency-path: frontend/package-lock.json }
      - run: npm ci
        working-directory: frontend
      - run: npm run build
        working-directory: frontend
      - name: Deploy to VPS
        uses: appleboy/scp-action@v0.1.7
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          source: frontend/dist/*
          target: /var/www/recibo42
          strip_components: 2
```

**GitHub secrets required:**
- `VPS_HOST` — `j4rvis.com.br`
- `VPS_USER` — `jarvis`
- `VPS_SSH_KEY` — private key of a deploy keypair (add public key to `~/.ssh/authorized_keys` on VPS)

---

## 11. Out of Scope (V1)

- 2FA / email OTP
- Offline-first (service worker precaches shell only; API calls require connectivity)
- Push notifications
- Multi-user / billing
- Line-item breakdown in expense detail
