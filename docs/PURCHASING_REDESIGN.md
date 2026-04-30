# Inköp till Projekt — Work Order Purchasing Redesign

## Goal
Make purchasing a first-class citizen inside Work Orders. Every employee must instantly see:
- What material is missing
- What has been ordered
- What is delayed
- What is blocking the job
- What is now ready

---

## 1. Purchasing Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. MATERIAL NEED IDENTIFIED                                                 │
│    From Work Order material list / order requirements / manual input         │
│      ↓                                                                      │
│ 2. SYSTEM CALCULATES AVAILABILITY                                           │
│    For each material:                                                       │
│    required_qty - stock_qty - reserved_qty = missing_qty                   │
│      ↓                                                                      │
│ 3. PURCHASE NEED CREATED                                                    │
│    Status: purchase_needed                                                  │
│      ↓                                                                      │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ PURCHASE NEED LIFECYCLE                                                 │ │
│ │                                                                         │ │
│ │  purchase_needed ──→ [Begär offert] ──→ quote_requested               │ │
│ │       ↓                                    ↓                            │ │
│ │  [Skapa PO direkt]                    Offert mottagen                   │ │
│ │       ↓                                    ↓                            │ │
│ │     ordered  ←────────────────────  quote_received                      │ │
│ │       ↓                                    ↓                            │ │
│ │  Leverans bekräftad  ←────────────  [Godkänn offert]                  │ │
│ │       ↓                                                                 │ │
│ │  partially_received ──→ [Markera mottagen] ──→ received               │ │
│ │       ↓                                                                 │ │
│ │   delayed ──→ [Uppdatera datum] ──→ back to ordered                    │ │
│ │       ↓                                                                 │ │
│ │  cancelled ──→ [Avbeställ] ──→ find alternative                        │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│      ↓                                                                      │
│ 4. RECEIVED → NO LONGER BLOCKING                                            │
│    Material is ready for picking / production / installation                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. UI Layout Inside Work Order

### Tab: "Material & Inköp"

```
┌──────────────────────────────────────────────────────────────────────────┐
│ MATERIAL & INKÖP                                          [+ Nytt behov] │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│ ┌──────────────────────────────────────────────────────────────────────┐ │
│ │ SAMMANFATTNING                                                       │ │
│ │  ┌────────┬────────┬──────────┬──────────┬─────────┬──────────┐     │ │
│ │  │Totalt 8│ Klara 3│Beställt 2│Väntar 2  │Saknas 1 │Försenat 1│     │ │
│ │  └────────┴────────┴──────────┴──────────┴─────────┴──────────┘     │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│ 🔴 SAKNAS — kräver åtgärd                                               │
│ ┌──────────────────────────────────────────────────────────────────────┐ │
│ │ LED Controller                                                       │ │
│ │   Behov: 10  │  Lager: 4  │  Saknas: 6                              │ │
│ │   [Begär offert]  [Skapa inköpsorder]  [Ej behövd]                   │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│ 🛒 BESTÄLLT — väntar på leverans                                        │
│ ┌──────────────────────────────────────────────────────────────────────┐ │
│ │ Strömförsörjning                                                     │ │
│ │   Behov: 2  │  Lager: 1  │  Beställt: 2                              │ │
│ │   Leverantör: Elgiganten    PO: PO-2024-042                          │ │
│ │   Förväntad: 12 maj      [Uppdatera datum] [Markera mottagen]        │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│ ⚠️ FÖRSENAT                                                              │
│ ┌──────────────────────────────────────────────────────────────────────┐ │
│ │ Monteringsprofil                                                     │ │
│ │   Behov: 8  │  Lager: 0  │  Beställt: 8                              │ │
│ │   Leverantör: ProfilAB    PO: PO-2024-038                            │ │
│ │   Förväntad: 5 maj — FÖRSENAD 25 dagar                               │ │
│ │   [Nytt datum]  [Markera mottagen]  [Avbeställ]                      │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│ ✅ KLAR                                                                  │
│ ┌──────────────────────────────────────────────────────────────────────┐ │
│ │ LED-modul 500x500                                                    │ │
│ │   Behov: 4  │  Lager: 12  │  Plockat: 4                              │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### Material Row Detail

| Field | Display | Example |
|-------|---------|---------|
| Article | Name + SKU | LED Controller (SKU-1023) |
| Required | Total needed | 10 |
| In Stock | Current warehouse qty | 4 |
| Reserved | Already reserved for this WO | 0 |
| Missing | Calculated gap | 6 |
| Purchase Status | Color-coded badge | 🛒 Beställd |
| Supplier | Name | Elgiganten AB |
| PO | Linked purchase order | PO-2024-042 |
| ETA | Expected delivery | 12 maj 2026 |
| Received | Qty received so far | 0 |
| Blocking | Yes/No + reason | 🔴 Ja — saknas 6 st |

---

## 3. Database Model

### 3A. Reuse Existing Tables

| Existing Table | Fields to Reuse | How |
|---|---|---|
| `PurchaseOrder` | `work_order_id`, `work_order_material_id`, `status`, `expected_delivery_date`, `supplier_name` | Link PO back to WO |
| `PurchaseOrderItem` | `article_id`, `quantity`, `purchase_order_id` | What was ordered |
| `WorkOrderMaterial` | `article_id`, `quantity_needed`, `quantity_picked`, `quantity_ordered`, `quantity_received`, `status`, `purchase_order_id` | Material line tracking |
| `Article` | `stock_qty`, `supplier_id`, `name`, `sku` | Stock availability |

### 3B. New Model: PurchaseNeed

Represents the need *before* a PurchaseOrder exists. Bridges the gap between "we need this" and "we ordered this".

```prisma
model PurchaseNeed {
  id                      String   @id @default(uuid())
  createdAt               DateTime @default(now()) @map("created_date")
  updatedAt               DateTime @updatedAt @map("updated_date")

  // Links
  work_order_id           String
  work_order_material_id  String?  // Optional: links to existing material line
  order_id                String?

  // Article info (denormalized for speed)
  article_id              String?
  article_name            String
  article_sku             String?

  // Quantities
  quantity_needed         Float    // How many needed for the project
  quantity_in_stock       Float?   // Snapshot when calculated
  quantity_reserved       Float    @default(0) // Reserved for this WO
  quantity_missing        Float    // Calculated: needed - stock - reserved
  quantity_ordered        Float    @default(0) // Total ordered across all POs
  quantity_received       Float    @default(0) // Total received

  // Status
  status                  PurchaseNeedStatus @default(purchase_needed)

  // Quote phase
  quote_requested_at      DateTime?
  quote_received_at       DateTime?
  quote_approved_at       DateTime?
  quote_approved_by       String?
  quote_supplier_id       String?
  quote_price             Float?
  quote_currency          String   @default("SEK")

  // Purchase order (when created)
  purchase_order_id       String?
  purchase_order_number   String?

  // Delivery tracking
  supplier_name           String?
  expected_delivery_date  DateTime?
  actual_delivery_date    DateTime?

  // Blocking
  is_blocking             Boolean  @default(true)
  blocker_reason          String?

  // Audit
  requested_by            String?  // email
  requested_by_name       String?

  notes                   String?
}

enum PurchaseNeedStatus {
  not_needed
  purchase_needed
  quote_requested
  quote_received
  ordered
  partially_received
  received
  delayed
  cancelled
}
```

### 3C. New Fields on Existing Models

**PurchaseOrder:**
```prisma
model PurchaseOrder {
  // ... existing fields ...
  
  // NEW: Quote tracking
  quote_requested_at      DateTime?
  quote_received_at       DateTime?
  quote_approved_at       DateTime?
  quote_approved_by       String?
  quote_price             Float?
  quote_currency          String   @default("SEK")
  
  // NEW: Delay tracking
  is_delayed              Boolean  @default(false)
  delay_reason            String?
  delay_notified_at       DateTime?
}
```

**PurchaseOrderItem:**
```prisma
model PurchaseOrderItem {
  // ... existing fields ...
  
  // NEW: Link back to material need
  work_order_material_id  String?
  purchase_need_id        String?
  
  // NEW: Receipt tracking per line
  quantity_received       Float    @default(0)
}
```

**WorkOrderMaterial:**
```prisma
model WorkOrderMaterial {
  // ... existing fields ...
  
  // NEW: Reservation tracking
  quantity_reserved       Float    @default(0)
  
  // NEW: Link to purchase need
  purchase_need_id        String?
}
```

---

## 4. Blocking Logic

```javascript
function calculateBlocking(workOrder) {
  const needs = workOrder.purchaseNeeds || [];
  
  const blockingNeeds = needs.filter(need => {
    // Not blocking if status is terminal
    if (['received', 'not_needed', 'cancelled'].includes(need.status)) {
      return false;
    }
    
    // Not blocking if we have enough in stock + received
    const available = (need.quantity_in_stock || 0) + need.quantity_received;
    if (available >= need.quantity_needed) {
      return false;
    }
    
    return true;
  });
  
  return {
    isBlocked: blockingNeeds.length > 0,
    reason: blockingNeeds.length > 0 
      ? `Saknar: ${blockingNeeds.map(n => n.article_name).join(', ')}`
      : null,
    blockingNeeds,
    canProceed: blockingNeeds.length === 0,
  };
}
```

**Rules:**
- A WorkOrder is **blocked** if any material has `quantity_needed > (stock + received)` and status is not `received|not_needed|cancelled`
- Lager/Production stages cannot be marked "ready" if the WorkOrder is blocked (unless admin override)
- Project manager sees expected delay based on `expected_delivery_date` of delayed items
- All status changes are logged in `WorkOrderActivity`

---

## 5. Actions Inside Work Order

| Action | Who | Result |
|---|---|---|
| Create purchase need | Project manager / Warehouse | `PurchaseNeed` created with status `purchase_needed` |
| Request quote | Purchaser | Status → `quote_requested` |
| Receive quote | Purchaser | Status → `quote_received`, enter price |
| Approve quote | Project manager | Status → `ordered`, create `PurchaseOrder` |
| Create PO directly | Purchaser | Skip quote phase, status → `ordered` |
| Link existing PO | Purchaser | Attach existing `PurchaseOrder` to need |
| Update ETA | Purchaser | Update `expected_delivery_date` |
| Mark received | Warehouse | Update `quantity_received`, status → `received` if complete |
| Mark delayed | Purchaser / PM | Status → `delayed`, set `delay_reason` |
| Cancel need | Admin / PM | Status → `cancelled`, must provide reason |
| Override blocker | Admin | Allow stage to proceed despite missing material |

---

## 6. Dashboard / Process View

Inköp should be visible in two places:

### A. WorkOrder List Row
```
ORD-2026-001    Axel Arigato    🔴 3 inköp saknas    2d sen
```

### B. Role Dashboard ("Min dag")
For purchasers:
```
┌─────────────────────────────────────┐
│ 🛒 INKÖP ATT GÖRA                   │
│ ─────────────────────────────────── │
│ • 3 offertbegäran att skicka        │
│ • 2 försenade leveranser att följa  │
│ • 5 inköpsorder att skapa           │
└─────────────────────────────────────┘
```

For project managers:
```
┌─────────────────────────────────────┐
│ 🔴 BLOCKERADE PROJEKT               │
│ ─────────────────────────────────── │
│ • LED-vägg Söderhallen — saknar 3   │
│ • Skylt Malmö — försenat 5 dagar    │
└─────────────────────────────────────┘
```

---

## 7. First Safe Implementation Step

### Phase 1: PurchaseNeed Model + Read-Only Board (2-3 days)

**Backend:**
1. Add `PurchaseNeed` model to Prisma schema
2. Add new fields to `PurchaseOrder`, `PurchaseOrderItem`, `WorkOrderMaterial`
3. Create migration / db push
4. New endpoint: `GET /api/v1/workorders/:id/purchase-needs`
5. Auto-calculate: when `WorkOrderMaterial` is created, create `PurchaseNeed` with calculated `quantity_missing`

**Frontend:**
1. New tab in WorkOrderView: **"Material & Inköp"**
2. Grouped display by status:
   - 🔴 Saknas (purchase_needed, quote_requested, quote_received)
   - 🛒 Beställd (ordered)
   - ⚠️ Försenat (delayed)
   - 📦 Delvis mottagen (partially_received)
   - ✅ Klar (received, not_needed)
3. Read-only with color-coded pills
4. Summary cards at top

**What NOT to change yet:**
- Existing PurchaseOrder creation flow
- Existing stock withdrawal flow
- Existing WorkOrder stage advancement
- No write actions in UI yet

**Why this is safe:**
- Only adds data, doesn't modify existing purchase logic
- PurchaseNeed is computed from existing WorkOrderMaterial + Article stock
- Gives immediate visibility into what's missing
- Sets up data model for Phase 2 (actions)

### Phase 2: Actions (2-3 days)
- "Create PO from missing items" button
- "Mark received" button
- "Update ETA" button
- Link back to PurchaseOrder flow

### Phase 3: Blocking Integration (1 day)
- Show blocker badge on WorkOrder list rows
- Prevent stage advancement when blocked
- Admin override

---

## Summary: Key Principles

1. **Purchasing is project-connected.** Every purchase need belongs to a Work Order.
2. **Status is transparent.** Everyone sees: missing → ordered → received.
3. **Blocking is explicit.** If material is missing, the job is blocked — show why.
4. **Quote phase is tracked.** Not just PO → also quote requested → received → approved.
5. **Delay is visible.** Late deliveries are flagged, not hidden.
6. **Actions are contextual.** What you can do depends on your role and the current status.
