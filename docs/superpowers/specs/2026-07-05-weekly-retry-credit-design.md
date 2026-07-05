# Weekly Retry Credit — Design

**Date:** 2026-07-05
**Status:** Approved (rolling 7-day window chosen by owner)

## Problem

Failed receipt scans (status `failed`) can only be resolved by manual data entry. Users should be able to re-run AI extraction on all failed scans, rate-limited to one batch retry per week per user.

## Semantics

- Each user holds **one retry credit** on a **rolling 7-day window**: the credit is available iff `retry_credit_used_at` is `NULL` or older than 7 days. Credits never accumulate.
- Spending the credit re-dispatches the existing `process_receipt` Celery task for **every** receipt of that user with status `failed`, in one action.
- A retry attempt with zero failed scans is rejected (400) and does **not** consume the credit.
- Consumption is atomic (guarded `UPDATE ... WHERE` on the timestamp) so concurrent requests cannot double-spend; the loser receives 409.

## Backend

- **Migration 006:** `users.retry_credit_used_at TIMESTAMPTZ NULL`.
- **`GET /api/credits`** → `{available: bool, next_credit_at: datetime|null, failed_count: int}`.
- **`POST /api/credits/retry-failed`** → consumes credit, dispatches tasks, returns `{retried_count, next_credit_at}`. Errors: 400 no failed scans, 409 no credit.
- Reuses `ReceiptStatus.failed` and `process_receipt.delay`; no worker changes.

## Frontend

- `creditsApi` client module.
- Dashboard: when failed receipts exist, show a retry banner above the failed list — enabled button ("Tentar ler novamente · 1 crédito semanal") when credit available, otherwise muted text with next credit date. On success, invalidate `receipts` and `credits` queries; retried receipts re-enter the existing "Processando" flow via SSE updates.

## Testing

- Backend (`tests/test_credits.py`): status endpoint availability states, successful consume + task dispatch (mocked), 400 on zero failed, 409 inside window, credit available again after 7 days (freeze/monkeypatch timestamp).
- Frontend: existing vitest suite must stay green; no component test infra exists, UI verified manually.

## Out of scope

Per-receipt retries, credit accrual/stacking, admin credit grants, paid credits.
