# Merchant Category Auto-fill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a user selects a previously used merchant, the category field auto-fills with the most recently used category for that merchant.

**Architecture:** Both pages already load the full expenses list for the merchant datalist. A `merchantCategoryMap` derived from that list (merchant → category of most recent dated expense) drives the auto-fill. No backend changes, no extra API calls.

**Tech Stack:** React, TypeScript, TanStack Query (data already in-cache)

---

### Task 1: ManualEntryPage — add merchantCategoryMap and auto-fill on merchant change

**Files:**
- Modify: `frontend/src/pages/expense/ManualEntryPage.tsx`

- [ ] **Step 1: Add `merchantCategoryMap` useMemo after the existing `merchants` useMemo (line 94)**

Insert immediately after the `merchants` useMemo block:

```tsx
const merchantCategoryMap = useMemo(() => {
  if (!expenses) return {} as Record<string, string>
  return expenses
    .filter((e) => e.merchant && e.category)
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
    .reduce<Record<string, string>>((acc, e) => {
      if (!acc[e.merchant]) acc[e.merchant] = e.category
      return acc
    }, {})
}, [expenses])
```

- [ ] **Step 2: Replace the merchant `Input` onChange to auto-fill category when empty**

In the form (around line 280), replace:
```tsx
onChange={(e) => setMerchant(e.target.value)}
```

With:
```tsx
onChange={(e) => {
  const val = e.target.value
  setMerchant(val)
  if (!category && merchantCategoryMap[val]) {
    setCategory(merchantCategoryMap[val])
  }
}}
```

- [ ] **Step 3: Verify manually**

Start the dev server. Open ManualEntryPage. Type a merchant name that exists in history — confirm the category field auto-populates. Then clear it, pick a different category manually, then type the same merchant again — confirm the category is NOT overridden (because it's already set).

---

### Task 2: ExpensePage — add merchantCategoryMap and auto-fill on merchant change

**Files:**
- Modify: `frontend/src/pages/expense/ExpensePage.tsx`

- [ ] **Step 1: Add `merchantCategoryMap` useMemo after the existing `merchants` useMemo (line ~200)**

Insert immediately after the `merchants` useMemo block:

```tsx
const merchantCategoryMap = useMemo(() => {
  if (!allExpenses) return {} as Record<string, string>
  return allExpenses
    .filter((e) => e.merchant && e.category)
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
    .reduce<Record<string, string>>((acc, e) => {
      if (!acc[e.merchant]) acc[e.merchant] = e.category
      return acc
    }, {})
}, [allExpenses])
```

- [ ] **Step 2: Replace the merchant `Input` onChange to auto-fill category after initialization**

In the form (around line 294), replace:
```tsx
onChange={(e) => setMerchant(e.target.value)}
```

With:
```tsx
onChange={(e) => {
  const val = e.target.value
  setMerchant(val)
  if (initialized && merchantCategoryMap[val]) {
    setCategory(merchantCategoryMap[val])
  }
}}
```

The `initialized` guard ensures we don't interfere with the initial hydration from the loaded expense.

- [ ] **Step 3: Verify manually**

Open an existing expense. Change the merchant field to a known merchant — confirm category updates. Reload the page — confirm the original expense's category is preserved (no auto-fill on initial load).

---

### Task 3: Commit

- [ ] **Commit both files**

```bash
git add frontend/src/pages/expense/ManualEntryPage.tsx frontend/src/pages/expense/ExpensePage.tsx
git commit -m "feat: auto-fill category from merchant history on vendor selection"
```
