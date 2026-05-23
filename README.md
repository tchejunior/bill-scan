# Recibo42

Receipt scanning and expense tracking for the Brazilian market. Scan a receipt with your phone camera, let AI extract the fields, review and save — then export spending reports as PDF.

**Live:** https://recibo42.com.br

---

## Architecture

```
frontend/   React 19 + Vite PWA (TypeScript, shadcn/ui, Tailwind)
backend/    FastAPI + Celery (Python 3.12, PostgreSQL, Redis)
nginx/      Reverse-proxy config (nginx.conf → /etc/nginx/sites-enabled/)
```

The frontend is deployed as static files served by nginx. The backend runs in Docker on the same VPS, with nginx proxying `/api/` to port 8080.

---

## Prerequisites

- Node 20+ (frontend)
- Python 3.12+, Docker, Docker Compose v2 (backend)
- An Anthropic API key (receipt OCR via Claude)

---

## Local Development

### Frontend

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
npm test           # Vitest unit tests
npm run build      # production build → dist/
```

The Vite dev server proxies `/api/` to `http://localhost:8080` (see `vite.config.ts`). Start the backend first, then the frontend.

### Backend

```bash
cp .env.example .env          # fill in passwords/keys
docker compose up -d postgres redis
cd backend
python -m venv .venv && source .venv/Scripts/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload  # http://localhost:8080
```

For Celery worker (receipt processing):

```bash
celery -A app.worker.celery_app worker --loglevel=info
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in:

| Variable | Description |
|---|---|
| `POSTGRES_PASSWORD` | Database password |
| `DATABASE_URL` | Full PostgreSQL connection string |
| `SECRET_KEY` | 64-char random secret for JWT signing |
| `REDIS_URL` | Redis connection string |
| `ANTHROPIC_API_KEY` | Set via Docker secret (see below) |
| `STORAGE_ROOT` | Path for uploaded receipt images |
| `COOKIE_SECURE` | `true` in production, `false` locally |

---

## Deploy

### Backend (VPS — j4rvis.com.br)

```bash
ssh jarvis@j4rvis.com.br
cd /home/jarvis/recibo42
make deploy    # git pull → docker build → alembic migrate → docker compose up
```

**First-time VPS setup:**

```bash
# Docker secrets (never plain env vars)
mkdir -p ~/secrets
echo "your-64-char-secret" > ~/secrets/recibo42_secret_key
echo "sk-ant-..." > ~/secrets/anthropic_api_key
chmod 600 ~/secrets/*

# Frontend web root
sudo mkdir -p /var/www/recibo42
sudo chown jarvis:www-data /var/www/recibo42

# Nginx config
sudo cp nginx/nginx.conf /etc/nginx/sites-enabled/recibo42
sudo nginx -t && sudo systemctl reload nginx
```

### Frontend (GitHub Actions)

Pushing to `master` with changes under `frontend/**` triggers `.github/workflows/deploy-frontend.yml`:

1. `npm ci && npm run build`
2. `scp frontend/dist/*` → `/var/www/recibo42` on VPS
3. `sudo systemctl reload nginx`

**Required GitHub secrets:**

| Secret | Value |
|---|---|
| `VPS_HOST` | `j4rvis.com.br` |
| `VPS_USER` | `jarvis` |
| `VPS_SSH_KEY` | Private key of a deploy keypair |

Add the deploy keypair's public key to `~/.ssh/authorized_keys` on the VPS.

---

## Key Design Decisions

- **httpOnly cookies** for auth — no JWT in `localStorage`, XSS-safe.
- **Docker file-based secrets** — `anthropic_api_key` and `secret_key` are never in env vars or compose files.
- **SSE for real-time updates** — receipt processing is async (Celery + Claude). The frontend subscribes to `/api/events`; when processing completes the dashboard updates without polling.
- **Same-origin API** — nginx proxies `/api/` so the frontend never makes cross-origin requests. httpOnly cookies work without CORS configuration.
- **Dual theme** — Dark & Bold (default) and Warm & Friendly (light) via CSS custom properties on `:root` / `[data-theme="warm"]`. Persisted to `localStorage`.

---

## Project Structure

```
backend/app/
  api/          auth, expenses, receipts, reports, events (SSE)
  models/       SQLAlchemy models
  schemas/      Pydantic schemas
  worker/       Celery tasks (Claude OCR → expense fields)

frontend/src/
  api/          typed fetch wrappers (auth, expenses, receipts, reports)
  components/   BottomNav, FAB, ExpenseCard, SkeletonCard, ThemeToggle, Toast
  hooks/        useSSE, useCamera, useAuth, useTheme
  pages/        auth/, dashboard/, scan/, expense/, reports/, settings/
  store/        Zustand (themeStore, scanStore)
  lib/          queryClient, utils (formatBRL, formatDate)
```
