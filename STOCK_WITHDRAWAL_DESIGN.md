# Stock Withdrawal Flow — Design Document

> Status: DESIGN PHASE — not yet implemented  
> Scope: Local system only (no deployment)

---

## 1. Ideal User Flow

### Flow A — Quick Single-Item Withdrawal (most common)
```
1. User clicks "Uttag från lager" button
2. Scan barcode OR search article by name/SKU
3. System shows:
   - Article name, image
   - Current stock qty
   - Shelf location
   - Batch number (if tracked)
4. User enters:
   - Quantity to withdraw (default: 1)
   - Reason code (dropdown)
   - Optional note
   - Optional: link to Order or WorkOrder
5. System validates stock >= quantity
6. User clicks "Bekräfta uttag"
7. Stock reduced immediately
8. Success toast + audit log entry
```

### Flow B — Multi-Item Withdrawal (project/internal job)
```
1. User creates "Nytt uttag"
2. Adds items one by one (scan/search)
3. Each line has:
   - Article, qty, reason, optional note
4. Optional: link Order/WO at header level
5. System calculates total value
6. If total value < threshold → submit immediately
   If total value >= threshold → submit for approval
7. Admin approves (can modify quantities)
8. Stock reduced atomically for all approved lines
```

### Flow C — Stock Adjustment (no physical withdrawal)
```
1. User finds article
2. Selects "Justera lager"
3. Enters:
   - Actual counted quantity OR delta (+/-)
   - Reason: correction, damaged, found_stock, shrinkage
   - Note explaining why
4. System records before/after snapshot
5. May require approval for large deltas
6. Stock updated, audit trail created
```

---

## 2. Database Model

### Problem with Existing Models

| Model | Issue |
|-------|-------|
| `InternalWithdrawal` | Only 1 article per record, no reason enum, no approval, no batch/shelf tracking |
| `StockAdjustment` | No link to Order/WO, no multi-line support, no approval workflow |

### Proposed New Model: `StockWithdrawal` (header + lines)

```prisma
model StockWithdrawal {
  id                    String                    @id @default(uuid())
  createdAt             DateTime                  @default(now()) @map("created_date")
  updatedAt             DateTime                  @updatedAt @map("updated_date")

  // Classification
  withdrawal_type       StockWithdrawalType       @default(internal_use)
    // internal_use | spare_part | adjustment | scrap | correction | production_material

  // Status lifecycle
  status                StockWithdrawalStatus     @default(draft)
    // draft | pending_approval | approved | rejected | completed | cancelled

  // Optional linkage
  linked_order_id       String?                   @map("linked_order_id")
  linked_work_order_id  String?                   @map("linked_work_order_id")

  // People
  requested_by          String                    // email
  approved_by           String?                   // email
  approved_at           DateTime?
  completed_by          String?                   // who executed the final stock deduction
  completed_at          DateTime?

  // Value & approval
  total_value_estimated Float?                    // sum(unit_cost × qty) at time of request
  approval_threshold    Float                     @default(5000) // SEK
  requires_approval     Boolean                   @default(false)

  // Notes
  notes                 String?
  rejection_reason      String?

  // Relations
  items                 StockWithdrawalItem[]
}

model StockWithdrawalItem {
  id                    String                    @id @default(uuid())
  createdAt             DateTime                  @default(now()) @map("created_date")
  updatedAt             DateTime                  @updatedAt @map("updated_date")

  stock_withdrawal_id   String                    @map("stock_withdrawal_id")
  stockWithdrawal       StockWithdrawal           @relation(fields: [stock_withdrawal_id], references: [id])

  // Article snapshot
  article_id            String                    @map("article_id")
  article_name          String?                   // snapshot
  unit_cost             Float?                    // snapshot at withdrawal time

  // Batch / location snapshot
  batch_id              String?                   @map("batch_id")
  batch_number          String?                   // snapshot
  shelf_address         String?                   // snapshot

  // Quantities
  quantity_requested    Float
  quantity_approved     Float?                    // approver can modify
  quantity_withdrawn    Float?                    // actual amount deducted

  // Reason per line
  reason_code           StockWithdrawalReason
    // internal_use | spare_part | damaged | scrap | correction | inventory_adjustment | production
  reason_notes          String?

  // Audit
  stock_before          Float?                    // article.stock_qty before
  stock_after           Float?                    // article.stock_qty after
}

enum StockWithdrawalType {
  internal_use
  spare_part
  adjustment
  scrap
  correction
  production_material
}

enum StockWithdrawalStatus {
  draft
  pending_approval
  approved
  rejected
  completed
  cancelled
}

enum StockWithdrawalReason {
  internal_use
  spare_part
  damaged
  scrap
  correction
  inventory_adjustment
  production
}
```

### Keep Existing Models (Migration Path)
- `StockAdjustment` stays for pure inventory count corrections
- `InternalWithdrawal` can be migrated to `StockWithdrawal` later
- New flow uses `StockWithdrawal` going forward

---

## 3. API Routes Needed

```
POST   /api/v1/functions/createStockWithdrawal
       → Creates draft, validates stock, calculates value, sets approval flag

POST   /api/v1/functions/submitStockWithdrawal
       → Draft → pending_approval OR completed (if no approval needed)

POST   /api/v1/functions/approveStockWithdrawal
       → Admin approves (can modify quantities)
       → Triggers atomic stock deduction

POST   /api/v1/functions/rejectStockWithdrawal
       → Admin rejects with reason

POST   /api/v1/functions/cancelStockWithdrawal
       → Cancels draft or pending request

GET    /api/v1/entities/StockWithdrawal
       → List with filters: status, requested_by, linked_order_id

GET    /api/v1/entities/StockWithdrawal/:id
       → Full detail with items

POST   /api/v1/functions/quickStockWithdrawal
       → Single-item immediate withdrawal (Flow A shortcut)
```

### Internal Helper (not exposed directly)
```
deductStockAtomic({ article_id, batch_id?, quantity, reason })
  → Runs in transaction:
    1. SELECT article FOR UPDATE
    2. Validate stock_qty >= quantity
    3. UPDATE article SET stock_qty = stock_qty - quantity
    4. IF batch_id: UPDATE batch SET stock_qty = batch.stock_qty - quantity
    5. RETURN article (new state)
```

---

## 4. Frontend Screens / Components

### A. Quick Withdrawal Modal (`QuickWithdrawalModal`)
- Scan input (autofocus)
- Article info card (image, name, stock, shelf)
- Quantity stepper (+/-)
- Reason dropdown
- Optional Order/WO link (search)
- "Bekräfta" button

### B. Multi-Item Withdrawal Page (`StockWithdrawalCreatePage`)
- Header: type selector, optional Order/WO link, notes
- Line items table (add/remove rows)
- Per row: article search, qty, reason, notes
- Footer: total value, approval warning, Submit button

### C. Withdrawal List Page (`StockWithdrawalListPage`)
- Filters: status, date range, requested_by, type
- Table: ID, type, items count, total value, status, requested_by, date
- Actions: View, Approve/Reject (admin only), Cancel (owner only)

### D. Withdrawal Detail Page (`StockWithdrawalDetailPage`)
- Header: status badge, approval state
- Items table with before/after stock
- Audit timeline (who created, approved, completed)
- Admin actions: Approve/Reject modal

### E. Stock Adjustment Page (`StockAdjustmentPage`)
- Article search
- Current stock display
- "New count" OR "Delta (+/-)" input
- Reason dropdown
- Note field
- Submit

---

## 5. Relation to Work Orders

| Work Order | Stock Withdrawal |
|-----------|------------------|
| Reserved stock first (`reserved_stock_qty`) | Direct deduction (`stock_qty`) |
| Planned in advance | Ad-hoc |
| Linked to Order (required) | Linked optional |
| Uses `ProductionRecord`, `Task` | Uses `StockWithdrawal` |
| Materials appear in WO materials list | Independent unless explicitly linked |

### Linking Rules
- A `StockWithdrawal` CAN link to a `WorkOrder` via `linked_work_order_id`
- When linked, the WO detail page shows "Related withdrawals" section
- But the withdrawal does NOT go through the WO stage lifecycle
- Withdrawal stock deduction is immediate, not reserved
- This prevents double-counting: WO reservation + withdrawal are separate concerns

### Preventing Double Deduction
- WO picking reduces `reserved_stock_qty` then `stock_qty`
- Stock Withdrawal reduces `stock_qty` directly
- If a withdrawal is linked to a WO, the system should WARN if the same article is also in the WO materials list
- But it should NOT block — real-world scenario: emergency spare part taken outside planned picking

---

## 6. Edge Cases

| # | Edge Case | Handling |
|---|-----------|----------|
| 1 | **Concurrent withdrawal** (2 users take same item simultaneously) | DB transaction with `SELECT FOR UPDATE` on Article row. Second request gets "Insufficient stock" error. |
| 2 | **Withdrawal qty > available stock** | Block at validation stage. Show: "Requested: 5, Available: 3". |
| 3 | **Partial approval** | Approver can reduce `quantity_approved`. Only approved amount deducted. Remainder stays in draft or is discarded. |
| 4 | **Cancellation after completion** | Create compensating `StockWithdrawal` of type `correction` with negative quantity (returns stock). Audit trail shows the full story. |
| 5 | **Batch not found** | If `batch_id` specified but batch deleted: fallback to general stock deduction, log warning. |
| 6 | **Shelf address changed after withdrawal** | `shelf_address` is snapshot on `StockWithdrawalItem`. Historical accuracy preserved. |
| 7 | **Unit cost changed after withdrawal** | `unit_cost` is snapshot. Historical cost accuracy preserved. |
| 8 | **Approval timeout** | Configurable (e.g., 48h). After timeout, auto-cancelled or escalated. |
| 9 | **High-value threshold bypass** | Admin can set `requires_approval = false` explicitly for urgent cases. Logged as override. |
| 10 | **Withdrawal for negative stock** (correction) | Adjustment-type withdrawals with `quantity > stock` are allowed ONLY for `correction`/`inventory_adjustment` reasons. |
| 11 | **Linked Order/WO deleted after withdrawal** | Soft-delete or archive. Withdrawal keeps `linked_order_id` as reference. Display as "[Deleted order]". |
| 12 | **User without permission tries to withdraw** | Permission check on API. Return `403`. Frontend hides button if no permission. |

---

## 7. Permissions Matrix

| Action | Lager | Tekniker | Admin |
|--------|-------|----------|-------|
| Create own withdrawal | ✅ | ✅ (limited types) | ✅ |
| Create for others | ❌ | ❌ | ✅ |
| Approve any | ❌ | ❌ | ✅ |
| Cancel own (draft/pending) | ✅ | ✅ | ✅ |
| Cancel others | ❌ | ❌ | ✅ |
| View all withdrawals | ✅ | ✅ (own + linked WO) | ✅ |
| Adjust/correct stock | ✅ | ❌ | ✅ |
| Bypass approval | ❌ | ❌ | ✅ |

---

## 8. First Safe Implementation Step

### Goal: Get a working Quick Withdrawal (Flow A) without breaking existing data

### Step 1 — Schema Extension (Minimal)
```
Add to prisma/schema.prisma:
- Extend InternalWithdrawal with:
  - reason: InternalWithdrawalReason? (new enum)
  - linked_work_order_id: String?
  - batch_id: String?
  - shelf_address: String?
  - stock_before: Float?
  - stock_after: Float?
  - unit_cost: Float?

- OR create new StockWithdrawal model (preferred for clean separation)
```

### Step 2 — Backend Function
```
Implement: POST /api/v1/functions/quickStockWithdrawal
- Accepts: { article_id, batch_id?, quantity, reason, notes?, linked_order_id?, linked_work_order_id? }
- Validates: article exists, stock_qty >= quantity
- Runs: deductStockAtomic() in transaction
- Creates: StockWithdrawal record (or InternalWithdrawal if extending)
- Returns: { success, withdrawal, article }
```

### Step 3 — Frontend Component
```
Create: QuickWithdrawalModal.jsx
- Barcode scan input
- Article lookup
- Qty + reason + notes
- Submit button
- Error handling for insufficient stock
```

### Step 4 — Test
```
- Withdraw 1 unit of existing article
- Verify article.stock_qty decreased by 1
- Verify audit record created
- Verify concurrent withdrawal blocked
```

### Step 5 — Iterate
```
- Add multi-item support
- Add approval workflow
- Add Order/WO linking UI
```

---

## 9. Key Design Principles

1. **Audit everything** — every stock change leaves a trace (who, what, when, why)
2. **Snapshot values** — unit_cost, shelf_address captured at withdrawal time
3. **Atomic deductions** — stock updates run in DB transactions with locking
4. **Separate concerns** — WorkOrder picking ≠ Stock Withdrawal. They can link but don't overlap.
5. **Fail safe** — insufficient stock blocks the operation; never allow negative stock by accident
6. **Approval for money** — high-value withdrawals need second pair of eyes
7. **Graceful migration** — existing `InternalWithdrawal` and `StockAdjustment` data stays intact

---

## 10. Open Questions (For Your Decision)

1. **Schema approach:** Extend `InternalWithdrawal` OR create new `StockWithdrawal` model?
2. **Approval threshold:** 5,000 SEK reasonable? Should it be configurable per user role?
3. **Negative stock:** Allow corrections that result in negative stock (for true-ups)?
4. **Batch tracking:** Is batch-level stock tracking required from day 1, or article-level sufficient?
5. **Notifications:** Email/push to approvers? In-app notification only?
