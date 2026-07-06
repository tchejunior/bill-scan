# Desktop Layouts & Persistent Receipt Viewer — Design

**Date:** 2026-07-05
**Status:** Approved (List/Table/Grid; applies to Dashboard + Reports + expense editing/creation views)

## Problem

The app is mobile-first; desktop renders narrow centered columns beside the existing `SideNav`. Reviewing a receipt while editing its expense requires opening a blocking full-screen modal, memorizing values, closing it, editing, and repeating.

## Layout preference

- Global preference `list | table | grid`, stored in `localStorage` via a zustand store (`layoutStore`), selected from a dropdown in the desktop `SideNav`.
- Mobile always renders current views (the sidebar — and thus the picker — is desktop-only; an md/lg media-query hook gates all desktop variants).

## Per-view mapping

| Pref | Dashboard | Reports | Expense edit/create (with receipt) |
|---|---|---|---|
| `list` (Lista) | current card list, widened | current stacked view, widened | form-focused split — image pane ~40% |
| `table` (Tabela) | dense table: date, merchant, category, payment, amount, badges; row click opens expense | breakdowns as data tables (categories, payment methods) instead of charts | even split — image pane 50% |
| `grid` (Grade) | responsive 2–4 col cards with receipt thumbnail | two-column: category chart left; payment methods + total + export right | image-focused split — image pane ~60% |

Dashboard status banners (processing/partial/failed/credit) stay above the expense area in all layouts.

## Persistent receipt viewer

New `ReceiptViewer` component (transform-based `translate + scale`):

- Mouse-wheel zoom centered on the cursor (non-passive listener, `preventDefault`).
- Click-drag panning; two-pointer pinch zoom (Pointer Events, works for mobile too).
- Double-click resets to fit; overlay +/− and fit buttons.
- Scale clamped to [0.5 × fit, 8]; fit recomputed on container resize until the user interacts.

Usage:

- **ExpensePage (lg+, receipt present):** two panes — sticky full-height viewer left (width per layout pref) with Refazer/Remover actions, form right. No modal.
- **ExpensePage (mobile):** current thumbnail → full-screen modal, modal body replaced by `ReceiptViewer`.
- **ManualEntryPage (linked receipt):** same two-pane treatment on lg+; mobile lightbox body replaced by `ReceiptViewer` (removes the duplicated bespoke lightbox logic).

## Components

- `store/layoutStore.ts` — zustand + localStorage persistence.
- `hooks/useIsDesktop.ts` — `matchMedia` hook.
- `components/ReceiptViewer.tsx` — pan/zoom viewer.
- `components/ExpenseTable.tsx`, `components/ExpenseGrid.tsx` — dashboard variants.
- Modified: `SideNav`, `DashboardPage`, `ReportsPage`, `ExpensePage`, `ManualEntryPage`.

## Testing

- `tsc`, vitest suite, production build must pass.
- Unit tests for `layoutStore` persistence and `ReceiptViewer` zoom math helpers.
- Visual spot-check via local preview at desktop viewport.

## Out of scope

Keyboard shortcuts, per-view independent layout preferences, table sorting/filtering, server-side persistence of the preference.
