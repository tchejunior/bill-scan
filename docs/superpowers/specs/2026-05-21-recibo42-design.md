# Recibo42 — Design Spec

**Domain:** recibo42.com.br  
**Date:** 2026-05-21  
**Target market:** Brazil (pt-BR UI)  
**Scope:** V1 — single-user beta, deployable to j4rvis.com.br VPS

---

## 1. Overview

Recibo42 is a mobile-first PWA for receipt scanning, AI-powered expense extraction, and spending reports. It replaces overloaded alternatives with a focused feature set: scan → auto-extract → review → report.

---

## 2. Architecture

**Pattern:** Monolith + async worker (V1). Refactor to separate API/processor microservices in V2.

**Stack:**
- Frontend: React + Vite (PWA, mobile-first)
- Backend: FastAPI + Uvicorn
- Task queue: Celery + Redis
- Database: PostgreSQL
- Image storage: Local filesystem (`/var/data/recibo42/{user_id}/{receipt_id}.webp`) — abstracted behind a `StorageBackend` interface (swappable to S3/R2 in V2)
- AI: Claude API (`claude-sonnet-4-6`, vision + structured JSON extraction)
- PDF generation: WeasyPrint (server-side HTML→PDF)
- Deployment: Docker Compose on j4rvis.com.br (Ubuntu 24.04, AMD EPYC 8-core, 16GB RAM, no GPU)
- Reverse proxy: Nginx + Let's Encrypt (Certbot)

**Docker Compose services:** `nginx`, `api`, `worker`, `postgres`, `redis`

**Real-time:** SSE via `GET /api/events` (one persistent connection per authenticated client). Worker publishes to Redis pub/sub channel; FastAPI SSE endpoint forwards to browser.

---

## 3. Data Model

### `users`
```
id            UUID PK
email         TEXT UNIQUE NOT NULL
password_hash TEXT NOT NULL
is_active     BOOLEAN DEFAULT true
otp_enabled   BOOLEAN DEFAULT false   -- V2: email OTP 2FA
created_at    TIMESTAMPTZ
```

### `receipts`
```
id             UUID PK
user_id        UUID FK → users (row-level isolation)
image_path     TEXT NOT NULL           -- relative: {user_id}/{receipt_id}.webp
status         ENUM(pending, processing, processed, failed)
uploaded_at    TIMESTAMPTZ
processed_at   TIMESTAMPTZ
raw_ai_output  JSONB                   -- full Claude response for debugging/re-processing
```

### `expenses`
```
id             UUID PK
user_id        UUID FK → users
receipt_id     UUID FK → receipts NULL  -- NULL = manual entry
vendor         TEXT
date           DATE NOT NULL
total_amount   NUMERIC(10,2) NOT NULL
currency       TEXT DEFAULT 'BRL'
category       TEXT                    -- controlled list, AI-suggested, user-overridable
payment_method ENUM(cash, credit, debit, pix, boleto, other)
notes          TEXT                    -- always editable, even while receipt is processing
is_manual      BOOLEAN DEFAULT false
created_at     TIMESTAMPTZ
updated_at     TIMESTAMPTZ
```

**Default categories:** Alimentação · Transporte · Saúde · Moradia · Lazer · Compras · Educação · Serviços/Utilidades · Viagem · Outros

---

## 4. Authentication

**V1:** Email + password (bcrypt hash). JWT access token (15min) + refresh token (30 days) stored in httpOnly cookies.

**V2 (planned):** Email OTP as mandatory 2FA. After password validation, send 6-digit OTP to registered email. `otp_enabled` column is already in schema.

All receipt and expense rows are scoped to `user_id` — no cross-account data access possible at the query level.

---

## 5. Receipt Processing Pipeline

```
1. Camera capture (PWA)
   MediaDevices API, facingMode: environment, max resolution.
   Flash toggle via ImageCapture API. Macro lens auto-selected on supporting devices.

2. Client-side crop (PWA)
   After capture, full image is displayed with cropperjs overlay.
   User adjusts corner handles. No auto-detection — user defines the crop.
   Cropped canvas blob is uploaded directly (no full-image transfer).

3. Upload → instant response (FastAPI)
   POST /api/receipts (multipart).
   Server: convert to WebP 85% quality, max 1920px long edge (Pillow).
   Save to /var/data/recibo42/{user_id}/{receipt_id}.webp.
   Create receipt row (status=pending).
   Enqueue Celery task.
   Return receipt_id in <200ms. User is free immediately.

4. Navigate away (PWA)
   App redirects to Dashboard. Receipt appears with "Processando…" pill.
   SSE connection stays alive. User can scan another receipt or close the app.

5. AI extraction (Celery worker)
   Read WebP → send to Claude API with structured extraction prompt.
   Extract: vendor, date, total_amount, subtotal, tax_amount, payment_method,
            suggested_category, currency, line_items[].
   Validate and normalise (ISO dates, float amounts).
   Write expenses row. Update receipt status=processed.
   Store full Claude JSON in raw_ai_output.

6. SSE push (FastAPI → PWA)
   Worker publishes receipt.processed event to Redis pub/sub.
   FastAPI SSE endpoint forwards to client:
     {"type":"receipt.processed","receipt_id":"…","expense_id":"…"}
   Dashboard row flips live. If user is on detail screen, AI fields animate in.
```

**Processing state UX:**
- Dashboard: receipt row shows "⏳ Processando…" pill with timestamp
- Expense detail (processing): AI fields show skeleton loaders (greyed out), Save button disabled
- Notes field is always enabled — user can type while AI runs; notes are preserved when fields animate in
- On SSE event: fields animate in, Save button enables, dashboard row updates without refresh

---

## 6. UI Screens

**Navigation:** Bottom tab bar — Início · Escanear · Relatório · Config

### Início (Dashboard)
- Current month summary: total spent + receipt count cards
- Expense list, reverse-chronological
- Processing receipts shown at top with status pill
- FAB (+) → modal: "Escanear recibo" | "Inserir manualmente"

### Escanear
- Full-screen camera viewfinder with guide overlay
- Controls: Flash · Macro · Galeria (pick from photo library)
- Capture button → crop screen

### Recorte (Crop review)
- Captured image with draggable corner handles for crop adjustment
- "Refazer" (retake) | "Confirmar" (upload + navigate to dashboard)

### Despesa (Expense detail)
- Shows receipt thumbnail at top
- All extracted fields editable: Estabelecimento · Data · Valor · Pagamento · Categoria · Obs.
- AI badge: "✨ Preenchido por IA" (green) or "⏳ Processando…" (orange, fields disabled)
- Save button disabled during processing

### Inserção Manual
- Same form as Expense detail, all fields empty, no receipt thumbnail
- No AI involvement

### Relatório
- Period chips: Último mês · 3 meses · 6 meses · 12 meses · 📅 Período personalizado
- Category breakdown bar chart
- Total by payment method
- "⬇ Exportar PDF" button

### Config
- Account info / change password
- Categories management (add/rename/reorder)
- (V2) 2FA toggle

---

## 7. PDF Report

Generated on-demand via `GET /api/reports/pdf?from=YYYY-MM-DD&to=YYYY-MM-DD`.  
Streamed directly to browser (Content-Disposition: attachment). Not stored on disk.

**Structure:**
```
Page 1 — Cover
  App name (Recibo42) + period label
  Total spent, receipt count
  Category breakdown (SVG bar chart)
  Payment method breakdown

Pages 2–N — Expense table
  Columns: Data | Estabelecimento | Categoria | Pagamento | Valor (R$)
  Grouped by category with subtotals
  Grand total at end

Appendix — Receipt images
  One receipt per page, full-width
  Caption below each: vendor · date · amount
  Only receipts within the selected period
```

---

## 8. Image Storage Abstraction

```python
class StorageBackend(Protocol):
    def save(self, user_id: str, receipt_id: str, data: bytes) -> str: ...
    def load(self, path: str) -> bytes: ...
    def delete(self, path: str) -> None: ...
    def url(self, path: str) -> str: ...

class LocalStorageBackend:
    root = "/var/data/recibo42"
    # V1 implementation

class S3StorageBackend:
    # V2 — swap in via config, no app code changes
```

---

## 9. V2 Roadmap (out of scope for V1)

- Email OTP 2FA (schema hook already in place: `otp_enabled`)
- Microservice split: separate `api` and `processor` services
- S3-compatible storage backend (Cloudflare R2 or Backblaze B2)
- Multi-user / SaaS billing (Stripe)
- Google OAuth sign-in option

---

## 10. Deployment

**VPS:** j4rvis.com.br — Ubuntu 24.04, 8-core AMD EPYC, 16GB RAM, 150GB disk, no GPU.  
**Domain:** recibo42.com.br (Let's Encrypt TLS via Certbot)

```yaml
# docker-compose.yml (summary)
services:
  nginx:    # SSL termination, static PWA files, proxy to api
  api:      # FastAPI + Uvicorn, 2 workers
  worker:   # Celery, concurrency configurable via CELERY_CONCURRENCY env var (default 2; I/O-bound)
  postgres: # persistent volume
  redis:    # task queue + SSE pub/sub channel

volumes:
  postgres_data:
  receipt_images: /var/data/recibo42
```

`.gitignore` additions: `.superpowers/`, `.env`, `receipt_images/`
