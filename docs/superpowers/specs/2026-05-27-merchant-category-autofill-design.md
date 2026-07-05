# Merchant Category Auto-fill

**Date:** 2026-05-27  
**Status:** Approved

## Problem

When the user selects a previously used merchant from the datalist, the category field stays blank, forcing manual re-selection every time.

## Approach

Derive a `merchantCategoryMap` from the expenses list already loaded on both pages. When the merchant input changes to an exact match, auto-fill the category with the most recently used one for that merchant.

No backend changes. No extra API calls.

## Data Source

Both `ExpensePage` and `ManualEntryPage` already query `['expenses']`. From that list, compute:

```
merchantCategoryMap: Record<string, string>
  merchant → category of the expense with the most recent `date`
  (only entries where both merchant and category are non-empty)
```

## Behavior

**ManualEntryPage (create):**
- When merchant `onChange` fires with a value that exactly matches a known merchant, auto-set category — **only if category is currently empty** (don't override a category the user already picked).

**ExpensePage (edit):**
- On initial load, category is hydrated from the existing expense — no auto-fill.
- If the user edits the merchant field and the new value exactly matches a known merchant (different from the original), auto-set category from the map (always — user is intentionally changing the merchant).

## Files Changed

- `frontend/src/pages/expense/ManualEntryPage.tsx`
- `frontend/src/pages/expense/ExpensePage.tsx`

## Out of Scope

- Payment method auto-fill
- Backend vendor preference storage
- Fuzzy/partial merchant matching
