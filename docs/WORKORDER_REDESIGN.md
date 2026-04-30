# Work Order Redesign — Employee/Operator Perspective

## Problem Statement

Current Work Order UX is built as a "master-detail" CRM view (532 lines of everything-at-once). An operator opens a Work Order and sees: chat, files, documents, delivery info, technical specs, role assignments, materials, tasks, activity feed — all simultaneously. There is no clear "what should I do now?" signal.

The new design must answer these 10 questions instantly:
1. What project/job is this?
2. Where is it in the process?
3. Who is responsible right now?
4. What is the next action?
5. What is blocking progress?
6. What material is needed?
7. What has been picked from stock?
8. What must be purchased?
9. What has already been ordered?
10. What is ready for production/installation/delivery?

---

## 1. Proposed Work Order Flow

### Mental Model: "The Job Journey"

A Work Order is a job that travels through 7 responsibility areas. Each area has:
- An **owner** (person/team)
- An **input** (what they receive)
- A **checklist** (what they must verify/complete)
- An **output** (what they hand off)
- A **status**: `not_started` → `in_progress` → `blocked` → `ready` → `completed`

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ORDER received                                                              │
│      ↓                                                                      │
│ ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                 │
│ │ Konstruktion │────→│Projektledning│────→│    Inköp     │                 │
│ │ (design)     │     │ (planning)   │     │ (purchase)   │                 │
│ └──────────────┘     └──────────────┘     └──────────────┘                 │
│                                                    ↓                        │
│ ┌──────────────────────────────────────────────────────────────────────┐   │
│ │                     MATERIAL STATUS BOARD                             │   │
│ │  Each item shows: needed | in stock | picked | ordered | received    │   │
│ └──────────────────────────────────────────────────────────────────────┘   │
│      ↓                               ↓                                      │
│ ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                 │
│ │    Lager     │────→│  Produktion  │────→│   Montering  │                 │
│ │ (pick/prep)  │     │ (manufacture)│     │ (install)    │                 │
│ └──────────────┘     └──────────────┘     └──────────────┘                 │
│                                                    ↓                        │
│                                           ┌──────────────┐                 │
│                                           │   Leverans   │                 │
│                                           │  (deliver)   │                 │
│                                           └──────────────┘                 │
│                                                    ↓                        │
│                                              JOB COMPLETED                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Stage Status Machine

Each of the 7 areas has its own status, independent of the overall Work Order stage:

| Status | Meaning | Visual |
|--------|---------|--------|
| `not_started` | Not yet reached this area | Gray, dimmed |
| `in_progress` | Currently being worked on | Blue, pulsing dot |
| `blocked` | Cannot proceed — missing something | Red, alert icon |
| `ready` | Input received, ready to start | Amber, waiting |
| `completed` | Done, handed off to next area | Green, checkmark |
| `skipped` | Not applicable for this project | Gray, strikethrough |

The **overall Work Order status** is driven by the areas: if any area is `blocked`, the Work Order shows a "BLOCKED" badge with the reason.

---

## 2. Proposed Screen Layout

### A. Work Order List (Pipeline View)

Already redesigned. Keep the pipeline-grouped list. One addition:
- **Blocker badge** on any row where a material item is `not_ordered` or a stage is `blocked`

### B. Work Order Detail — The Operator View

This replaces the current 532-line monster. Divided into three clear zones:

```
┌─────────────────────────────────────────────────────────────────────┐
│ 🔙  ← Back to list                                                  │
├─────────────────────────────────────────────────────────────────────┤
│ ZONE 1: HEADER (always visible, sticky)                             │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ Projekt: LED-vägg Söderhallen      [BLOCKED: Saknar 3 artiklar] │ │
│ │ Kund: Söderhallen AB                Deadline: 15 maj (5d kvar)  │ │
│ │ Prioritet: HÖG  |  Ansvarig nu: Anna (Lager)                   │ │
│ └─────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────┤
│ ZONE 2: PROCESS TRACKER                                             │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ Konstr.  →  Projekt  →  Inköp  →  [LAGER]  →  Prod.  →  Mont. │ │
│ │   ✅          ✅         🔴        🔄          ⏳       ⏳       │ │
│ │   KLAR      KLAR    BLOCKER   PÅGÅR      VÄNTAR    VÄNTAR      │ │
│ └─────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────┤
│ ZONE 3: MAIN CONTENT (tabbed)                                       │
│                                                                     │
│  [Att göra nu]  [Material & Inköp]  [Info & Dokument]  [Historik]  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ ACTIVE TAB: "Att göra nu" (contextual to current stage)      │  │
│  │                                                               │  │
│  │  📦 LAGER — Detta är ditt ansvar nu                          │  │
│  │  ─────────────────────────────────────                       │  │
│  │  Checklista:                                                 │  │
│  │  [x] Kontrollera plocklista                                  │  │
│  │  [ ] Plocka artikel #1023 (LED-modul 500x500)                │  │
│  │  [ ] Plocka artikel #1024 (Strömförsörjning)                 │  │
│  │  [ ] Verifiera antal                                         │  │
│  │                                                               │  │
│  │  ⚡ NÄSTA HANDLING:                                          │  │
│  │  ┌──────────────────────────────────────────────────────┐    │  │
│  │  │ [📦 Snabb uttag]  [Skriv ut plocklista] [Markera klar]│    │  │
│  │  └──────────────────────────────────────────────────────┘    │  │
│  │                                                               │  │
│  │  🔴 BLOCKERAR: Inköp är inte klart för 3 artiklar            │  │
│  │     → Se fliken "Material & Inköp" för detaljer              │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### C. The "Att göra nu" Tab (Contextual by Stage)

This tab changes content based on which stage is **current and assigned to the logged-in user**:

**If current stage = Konstruktion:**
```
✏️ KONSTRUKTION — Ditt ansvar
─────────────────────────────────
Checklista:
[ ] Granska ritning
[ ] Kontrollera mått
[ ] Godkänn teknisk spec

NÄSTA: [Godkänn konstruktion] [Begär ändring]
```

**If current stage = Lager:**
```
📦 LAGER — Ditt ansvar
─────────────────────────────────
Plocklista:
[x] LED-modul 500x500    Behov: 4   Lager: 12   [Plocka]
[ ] Strömförsörjning     Behov: 2   Lager: 1    ⚠️ Saknas 1
[ ] Kablar               Behov: 10  Lager: 0    🔴 Ej beställd

NÄSTA: [📦 Snabb uttag] [Markera plockning klar]
```

**If current stage = Produktion:**
```
🏭 PRODUKTION — Ditt ansvar
─────────────────────────────────
Materialstatus: ✅ Allt på plats

Checklista:
[ ] Förbered arbetsstation
[ ] Starta produktion
[ ] Kvalitetskontroll
[ ] Markera färdig

NÄSTA: [Starta produktion] [Rapportera avvikelse]
```

### D. The "Material & Inköp" Tab

This is the **procurement status board** — the heart of material visibility:

```
┌──────────────────────────────────────────────────────────────────────────┐
│ MATERIAL & INKÖP                                          [+ Beställ ny] │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│ ┌──────────────────────────────────────────────────────────────────────┐ │
│ │ SAMMANFATTNING                                                       │ │
│ │  ✅  8 artiklar klara  |  ⚠️  3 väntar på leverans  |  🔴  2 saknas  │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│ Artikel              Behov  Lager  Plockat  Beställt  Leverans   Status   │
│ ─────────────────────────────────────────────────────────────────────────│
│ LED-modul 500x500       4     12        0        —         —    ✅ KLAR  │
│ Strömförsörjning        2      1        0        —         —    ⚠️ PLOCKA│
│ Kabel CAT6             10      0        0       10     12 maj   🚚 PÅ VÄG│
│ Monteringsprofil        8      0        0        0         —    🔴 SAKNAS│
│ Kontrollbox             1      3        0        —         —    ✅ KLAR  │
│                                                                          │
│ 🔴 Monteringsprofil — ej beställd                                        │
│    [Skapa inköpsorder] [Markera beställd] [Ange leveransdatum]           │
│                                                                          │
│ 🚚 Kabel CAT6 — beställd från Elgiganten #PO-2024-042                   │
│    Förväntad: 12 maj  |  [Markera mottagen] [Uppdatera datum]            │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

**Material item statuses:**
- `in_stock` — available in warehouse, ready to pick
- `partially_picked` — some picked, more needed
- `picked` — fully picked, ready for production
- `not_ordered` — needed but no purchase order exists
- `purchase_needed` — flagged for procurement
- `ordered` — purchase order created, waiting for delivery
- `partially_received` — some arrived, waiting for rest
- `received` — fully received, ready for picking
- `cancelled` — order cancelled, find alternative

### E. The "Info & Dokument" Tab

Static project info: customer, delivery address, technical specs, drawings, files, site info. Read-only for most operators.

### F. The "Historik" Tab

Activity log — every action, decision, file upload, stage change, material status change. Filterable by type.

---

## 3. Proposed Data Model Additions

### A. `WorkOrderStageStatus` (new JSON field on WorkOrder)

Replace the flat `current_stage` enum with a structured object:

```json
{
  "konstruktion": {
    "status": "completed",
    "started_at": "2024-05-01T08:00:00Z",
    "completed_at": "2024-05-03T14:30:00Z",
    "assigned_to": "user@imvision.se",
    "assigned_name": "Erik Konstruktör",
    "checklist": {
      "review_drawings": true,
      "check_measurements": true,
      "approve_design": true
    },
    "notes": "Ritning godkänd av kund"
  },
  "projektledning": {
    "status": "completed",
    "started_at": "2024-05-03T15:00:00Z",
    "completed_at": "2024-05-04T10:00:00Z",
    "assigned_to": "user2@imvision.se",
    "assigned_name": "Lisa Projektledare",
    "checklist": {
      "confirm_dates": true,
      "assign_team": true,
      "approve_plan": true
    }
  },
  "inkop": {
    "status": "blocked",
    "started_at": "2024-05-04T11:00:00Z",
    "completed_at": null,
    "assigned_to": "user3@imvision.se",
    "assigned_name": "Patrik Inköpare",
    "checklist": {
      "identify_missing": true,
      "create_pos": false
    },
    "blocker_reason": "Leverantör X har 6 veckors ledtid på monteringsprofiler"
  },
  "lager": {
    "status": "not_started",
    "started_at": null,
    "completed_at": null,
    "assigned_to": null,
    "assigned_name": null,
    "checklist": {}
  },
  "produktion": { "status": "not_started", ... },
  "montering": { "status": "not_started", ... },
  "leverans": { "status": "not_started", ... }
}
```

**Why JSON?** The structure is hierarchical and read-heavy. Each Work Order fetch needs all 7 stages. A separate table would require 7 joins. JSON is pragmatic here.

### B. `WorkOrderMaterial` (new model — NOT JSON)

Each material line item must be queryable independently for reporting and stock linking.

```prisma
model WorkOrderMaterial {
  id                    String   @id @default(uuid())
  createdAt             DateTime @default(now()) @map("created_date")
  updatedAt             DateTime @updatedAt @map("updated_date")
  work_order_id         String
  article_id            String?  // Link to Article if exists
  article_name          String   // Denormalized for display
  article_sku           String?  // For matching
  quantity_needed       Float    // How many required
  quantity_picked       Float    @default(0) // How many picked from stock
  quantity_ordered      Float    @default(0) // How many ordered from supplier
  quantity_received     Float    @default(0) // How many received from supplier
  stock_qty_at_check    Float?   // Snapshot of stock when checked
  status                WorkOrderMaterialStatus @default(not_checked)
  purchase_order_id     String?  // Link to PurchaseOrder
  purchase_order_number String?  // Denormalized
  supplier_name         String?
  expected_delivery     DateTime?
  notes                 String?
  picked_by             String?  // Who picked it
  picked_at             DateTime?
  
  // Links
  stock_withdrawal_id   String?  // Link to StockWithdrawal if created from WO
}
```

```prisma
enum WorkOrderMaterialStatus {
  not_checked       // Just added, not verified against stock
  in_stock          // Available in warehouse
  partially_picked  // Some picked, more available
  picked            // Fully picked
  not_ordered       // Not available, no PO exists
  purchase_needed   // Flagged for procurement
  ordered           // PO created, waiting
  partially_received // Some arrived
  received          // Fully received, ready to pick
  cancelled         // Order cancelled
  not_needed        // Decided not needed
}
```

### C. `WorkOrder` field additions

```prisma
model WorkOrder {
  // ... existing fields ...
  
  // NEW: Structured stage tracking (replaces flat current_stage logic)
  stage_statuses        Json?    // { konstruktion: {...}, projektledning: {...}, ... }
  
  // NEW: Blocker tracking
  is_blocked            Boolean  @default(false)
  blocker_reason        String?  // Human-readable why blocked
  blocker_stage         String?  // Which stage is causing the block
  blocker_material_id   String?  // Which material item is blocking
  
  // NEW: Current responsible (computed, but cached for fast list queries)
  current_responsible_email   String?
  current_responsible_name    String?
  current_responsible_stage   String?  // Which stage they own
  
  // NEW: Material readiness
  materials_total_count       Int      @default(0)
  materials_ready_count       Int      @default(0)
  materials_ordered_count     Int      @default(0)
  materials_missing_count     Int      @default(0)
  
  // existing: materials_needed Json? → DEPRECATE, use WorkOrderMaterial model
}
```

### D. `PurchaseOrder` additions

```prisma
model PurchaseOrder {
  // ... existing fields ...
  
  work_order_id         String?  // Link back to WorkOrder
  work_order_material_id String? // Link to specific material line
}
```

### E. `StockWithdrawal` additions (already exists)

Already has `work_order_id` and `order_id`. Just need to ensure it's populated when withdrawal is created from a Work Order.

---

## 4. How Purchasing Connects to Work Orders

### The Procurement Chain

```
Work Order created
    ↓
Material lines generated from OrderItems
    ↓
For each material line:
    ├─ Check stock availability → update status to in_stock / not_ordered
    ├─ If not in stock:
    │   ├─ User clicks "Skapa inköpsorder" → creates PurchaseOrder
    │   │   PurchaseOrder.work_order_id = WorkOrder.id
    │   │   PurchaseOrder.work_order_material_id = WorkOrderMaterial.id
    │   ├─ WorkOrderMaterial.status = "ordered"
    │   └─ WorkOrderMaterial.purchase_order_id = PurchaseOrder.id
    │
    └─ When PurchaseOrder status changes:
        ├─ "sent" / "confirmed" → WorkOrderMaterial.status = "ordered"
        ├─ "partially_received" → WorkOrderMaterial.status = "partially_received"
        ├─ "received" → WorkOrderMaterial.status = "received"
        └─ "cancelled" → WorkOrderMaterial.status = "cancelled"
    
    When material is picked:
    ├─ Create StockWithdrawal with work_order_id
    ├─ WorkOrderMaterial.quantity_picked += amount
    └─ If quantity_picked >= quantity_needed: status = "picked"
```

### Rules

1. **Purchase orders created from a Work Order** must link back via `work_order_id`
2. **Purchase order status changes** must propagate to linked `WorkOrderMaterial` statuses
3. **Stock withdrawals from a Work Order** must link via `work_order_id` and update `WorkOrderMaterial`
4. **A Work Order's `is_blocked`** auto-computes: true if any material has status `not_ordered` or any stage has status `blocked`
5. **Activity logging**: every purchase order creation, stock withdrawal, stage change, material status change → creates a `WorkOrderActivity` record

---

## 5. First Safe Implementation Step

### Phase 1: Read-Only Material Board (1-2 days)

**Goal:** Give operators visibility into material status WITHOUT changing any existing logic.

**What to build:**
1. **Backend:**
   - Add `WorkOrderMaterial` model to Prisma schema
   - Add `stage_statuses`, `is_blocked`, `blocker_*` fields to `WorkOrder` (nullable, no breaking changes)
   - Migration: populate `WorkOrderMaterial` rows from existing `materials_needed` JSON
   - New endpoint: `GET /api/v1/workorders/:id/materials` — returns material lines with stock & PO status

2. **Frontend:**
   - New tab in WorkOrderView: **"Material & Inköp"**
   - Read-only table showing each material line with:
     - Article name
     - Needed quantity
     - Stock quantity (fetched live from Article)
     - Purchase status (fetched from linked PurchaseOrder)
   - Color-coded status pills

3. **What NOT to change yet:**
   - Existing `current_stage` logic
   - Existing WorkOrders list view
   - Existing purchase order creation flow
   - Existing stock withdrawal flow

**Why this is safe:**
- Only ADDs data, doesn't modify existing flows
- Material board is read-only — no risk of breaking existing operations
- Gives immediate value: operators can finally SEE what's missing
- Sets up data model for Phase 2

### Phase 2: Contextual "Att göra nu" Tab (2-3 days)

- Replace the monolithic WorkOrderView with tabbed layout
- "Att göra nu" tab shows stage-specific checklist and CTA
- Stage status computed from existing `current_stage` + new `stage_statuses`

### Phase 3: Actions from Material Board (2-3 days)

- Add "Skapa inköpsorder" button on material rows
- Add "Snabb uttag" button on in-stock rows
- Link actions back to WorkOrderMaterial

### Phase 4: Pipeline List Improvements (1 day)

- Add blocker badges to WorkOrders list rows
- Add material readiness summary to row

---

## Summary: Key Principles

1. **Operators first, not admins.** Every screen answers "what do I do now?"
2. **Material is the bottleneck.** Make procurement status visible and actionable.
3. **Stage ownership is explicit.** Every stage has a name, a checklist, and a handoff.
4. **Blockers are visible.** A Work Order is "blocked" when any stage or material is stuck — show WHY.
5. **No forced flows.** Stock withdrawal can be standalone OR linked to Work Order. Purchase orders can exist independently OR be created from Work Order.
