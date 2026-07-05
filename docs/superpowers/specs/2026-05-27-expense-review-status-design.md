# Expense Review Status & Category Chips

**Date:** 2026-05-27  
**Status:** Approved

## Goal

Give users a quick visual signal in the expense list that a receipt has been manually reviewed, and display the category as a colored chip for faster scanning.

## Backend

### Migration `004_add_expense_status`

Add a non-nullable `status VARCHAR` column to the `expenses` table with a server default of `'pending'`. Existing rows get `'pending'` automatically.

```sql
ALTER TABLE expenses ADD COLUMN status VARCHAR NOT NULL DEFAULT 'pending';
```

### Model (`app/models/expense.py`)

```python
status = Column(String, server_default="pending", nullable=False)
```

### Schema (`app/schemas/expense.py`)

- `ExpenseRead`: add `status: str`
- `ExpenseUpdate`: add `status: Optional[str] = None` — allows the partial-status agent to set `'partial'` explicitly without triggering the save-promotes-to-reviewed logic

### PATCH handler (`app/api/expenses.py`)

After applying all update fields, add:

```python
if expense.status != 'reviewed':
    expense.status = 'reviewed'
```

This means any save via the UI promotes the expense from `pending` or `partial` to `reviewed`. An expense already at `reviewed` stays there (idempotent). The `status` field in `ExpenseUpdate` lets other agents set `partial` directly without going through the PATCH save flow.

### Status values

| Value | Meaning |
|---|---|
| `pending` | Not yet manually reviewed (default) |
| `partial` | Partially filled — set by the partial-status agent |
| `reviewed` | User has saved the expense at least once |

## Frontend

### Type (`src/api/expenses.ts`)

Add `status: string` to the `Expense` interface.

### `ExpenseCard` (`src/components/ExpenseCard.tsx`)

**Reviewed checkmark:** When `expense.status === 'reviewed'`, render a small green ✓ badge inline after the merchant name, consistent with the existing `isDuplicate` and `aiProcessed` badge pattern.

**Category chip:** Replace the plain `{expense.category}` text in the subtitle row with a `<CategoryChip>` component (defined in the same file). The chip uses `rgba(color, 0.15)` background and the solid color for text, matching the existing badge aesthetic.

### Category color map

| Category | Hex |
|---|---|
| Alimentação | `#ff9500` |
| Transporte | `#007aff` |
| Saúde | `#34c759` |
| Lazer | `#af52de` |
| Moradia | `#32ade6` |
| Educação | `#5856d6` |
| Outro | `#8e8e93` |

Unknown categories fall back to `#8e8e93` (gray).

## Out of scope

- Showing status in `ExpensePage` header (the existing ✨ IA / ⏳ Processando badges already cover that view)
- A manual "mark as reviewed" button — save action is the trigger
- Any changes to the `partial` state logic — owned by another agent
