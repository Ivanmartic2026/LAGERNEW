# Order Status Model — Full Impact Analysis & Migration Plan

*Research conducted before any schema or code changes.*

---

## 1. Where Order Fields Are Defined

### Entity Schema Location
```
base44/entities/Order.jsonc  (268 lines, 49 custom properties)
```

### Current `status` Field Definition
```json
"status": {
  "type": "string",
  "enum": [
    "SÄLJ",
    "KONSTRUKTION",
    "PRODUKTION",
    "LAGER",
    "MONTERING"
  ],
  "default": "SÄLJ",
  "description": "Operativ orderstatus"
}
```

### Key Observations
- The schema enum has **only 5 values**.
- The codebase writes **at least 13 different values** to this field.
- Base44 does **not enforce the enum** — it is documentation-only. Invalid values are stored silently.
- `statusLabels` in `OrderDetail.jsx` already contains fallback labels for **non-enum values** (`draft`, `in_production`, `picking`, `shipped`, `delivered`, `cancelled`), confirming the developers knew the enum was being violated.

---

## 2. Complete order.status Reference Inventory

### 2A. Frontend Reads (Display / UI)

| # | File | Line | Context | Status Values Read |
|---|------|------|---------|-------------------|
| 1 | `OrderDetailModal.jsx` | 150 | Badge color + label | All (via `statusColors`/`statusLabels` maps) |
| 2 | `OrderForm.jsx` | 24 | Form initialization | `order?.status \|\| 'draft'` |
| 3 | `ArticleDetail.jsx` | 1762-1767 | Linked orders list badge | `ready_to_pick`, `picking`, `picked`, `delivered`, `cancelled`, fallback |
| 4 | `SiteDocumentationFlow.jsx` | 297 | Order list text display | Any |
| 5 | `LinkToOrderModal.jsx` | 121 | Badge conditional | `LAGER` vs others |
| 6 | `OrderDetail.jsx` | 160 | Phase bar index | `SÄLJ`, `KONSTRUKTION`, `PRODUKTION`, `LAGER`, `MONTERING` |
| 7 | `OrderDetail.jsx` | 249 | Status badge | All (via `statusColors`/`statusLabels`) |
| 8 | `OrderEdit.jsx` | 94 | Selected stages init | `order.status` or `['SÄLJ']` |
| 9 | `Orders.jsx` | 790 | List status badge | All (via `statusColors`/`statusLabels`) |
| 10 | `PickOrder.jsx` | 306 | Button style | `picked` |
| 11 | `PickOrder.jsx` | 312 | Button label | `picked` |
| 12 | `Production.jsx` | 261 | Color lookup | Any |
| 13 | `StockForecast.jsx` | 230 | Badge style + label | `picking` |
| 14 | `WarehouseDashboard.jsx` | 340 | Status label | `picking` |
| 15 | `OrderDashboard.jsx` | 195 | Stage fallback | `wo.current_stage \|\| wo.status \|\| order.status` |

### 2B. Frontend Writes (User Actions)

| # | File | Line | Action | Status Value Written |
|---|------|------|--------|---------------------|
| 1 | `OrderForm.jsx` | 80-83 | Create/Edit order | `order?.status \|\| 'draft'` (form value) |
| 2 | `OrderDetail.jsx` | 304-305 | "Markera försäljning klar" | `KONSTRUKTION` |
| 3 | `OrderEdit.jsx` | 168 | Save edited order | Form `status` field |
| 4 | `PickOrder.jsx` | 96-98 | Auto-set on mount | `picking` (from `ready_to_pick`) |
| 5 | `PickOrder.jsx` | 194-196 | All items picked | `picked` |
| 6 | `PickOrder.jsx` | 515-517 | Mark delivered | `delivered` |
| 7 | `PickOrder.jsx` | 523-525 | Send to production | `in_production` |
| 8 | `PickOrder.jsx` | 534-536 | Send to production (alt) | `in_production` |
| 9 | `ProductionView.jsx` | 120-123 | Start production | `in_production` |
| 10 | `ProductionView.jsx` | 260-263 | Complete production | `production_completed` |

### 2C. Backend / Function Writes (System Actions)

| # | File | Line | Trigger | Status Value Written |
|---|------|------|---------|---------------------|
| 1 | `processOrderDocument/entry.ts` | 105-108 | Document processing | `draft` |
| 2 | `processIncomingOrderEmail/entry.ts` | 199-200 | Email order import | `ready_to_pick` |
| 3 | `updateWorkOrderStage/entry.ts` (NEW) | 180 | WO completion | `MONTERING` |

### 2D. Filters / Dashboards / Counts

| # | File | Line | Purpose | Status Values Checked |
|---|------|------|---------|----------------------|
| 1 | `SiteDocumentationFlow.jsx` | 37-38 | Active orders filter | `cancelled`, `delivered` |
| 2 | `HomeIvan.jsx` | 33 | Pipeline chart counts | `SÄLJ`, `KONSTRUKTION`, `PRODUKTION`, `LAGER`, `MONTERING` |
| 3 | `HomeKonstruktor.jsx` | 27 | Orders needing WO | `KONSTRUKTION` |
| 4 | `HomeSaljare.jsx` | 24-25 | Sales pipeline | `SÄLJ`, `KONSTRUKTION` |
| 5 | `OrderDashboard.jsx` | 186-187 | Exclude from dashboard | `SÄLJ` |
| 6 | `OrderDetail.jsx` | 299 | Show "sales complete" button | `SÄLJ` + `!sales_completed` |
| 7 | `OrderDetail.jsx` | 326 | Show construction actions | `KONSTRUKTION` |
| 8 | `OrderDetail.jsx` | 751 | Show pick receipt | `picked` |
| 9 | `Orders.jsx` | 308 | Status filter match | Any statusFilter value |
| 10 | `Orders.jsx` | 313 | Invoice filter | `picked` |
| 11 | `Orders.jsx` | 317 | Exclude invoiced | `picked` + `fortnox_invoiced` |
| 12 | `Orders.jsx` | 399 | Group by status | `picking` |
| 13 | `Orders.jsx` | 611 | Count in_production | `in_production` |
| 14 | `Orders.jsx` | 632 | Count picking | `picking` |
| 15 | `Orders.jsx` | 638 | Pending invoice count | `picked` |
| 16 | `Orders.jsx` | 907 | Phase bar index | `SÄLJ`–`MONTERING` |
| 17 | `Orders.jsx` | 951 | Show picking actions | `picking` |
| 18 | `Orders.jsx` | 1018 | Show "Create WO" button | `!== 'in_production'` |
| 19 | `Orders.jsx` | 1040 | Show production button | `picked` |
| 20 | `Orders.jsx` | 1053 | Show invoice button | `picked` + `!fortnox_invoiced` |
| 21 | `Orders.jsx` | 1075 | Show delivery button | `picked` |
| 22 | `PickOrder.jsx` | 95 | Auto-set picking | `ready_to_pick` |
| 23 | `PickOrder.jsx` | 487 | Show pick UI | `!== 'picked'` |
| 24 | `PickOrder.jsx` | 507 | Show receipt UI | `picked` |
| 25 | `Production.jsx` | 43-45 | Production orders filter | `picked`, `in_production`, `production_completed` |
| 26 | `Production.jsx` | 59-61 | Stats counts | `picked`, `in_production`, `production_completed` |
| 27 | `ProductionView.jsx` | 339 | Show start production | `picked` |
| 28 | `ProductionView.jsx` | 348 | Show in-progress UI | `in_production` |
| 29 | `ProductionView.jsx` | 373 | Show pick list | `picked` |
| 30 | `ProductionView.jsx` | 434 | Show completion UI | `production_completed` |
| 31 | `StockForecast.jsx` | 61 | Filter forecast items | `ready_to_pick`, `picking` |
| 32 | `WarehouseDashboard.jsx` | 81-82 | Warehouse active orders | `ready_to_pick`, `picking` |
| 33 | `WarehouseDashboard.jsx` | 88 | Dashboard active count | `ready_to_pick`, `picking` |
| 34 | `exportOrders/entry.ts` | 22 | Export filter | `picked` + `!fortnox_invoiced` |
| 35 | `getPublicOrders/entry.ts` | 23 | Public dashboard filter | `SÄLJ`, `cancelled`, `delivered` |
| 36 | `syncReservedStock/entry.ts` | 12-13 | Stock reservation filter | `delivered`, `cancelled`, `shipped` |

---

## 3. Status Value Universe

### All Values Found in Code

| Value | Schema Enum? | Used In System | Written By |
|-------|-------------|----------------|------------|
| `SÄLJ` | ✅ Yes | A (Project) | OrderDetail.jsx, default |
| `KONSTRUKTION` | ✅ Yes | A (Project) | OrderDetail.jsx |
| `PRODUKTION` | ✅ Yes | A (Project) | Rare — legacy? |
| `LAGER` | ✅ Yes | A (Project) | Legacy? |
| `MONTERING` | ✅ Yes | A (Project) | updateWorkOrderStage |
| `ready_to_pick` | ❌ No | B (Operational) | processIncomingOrderEmail |
| `picking` | ❌ No | B (Operational) | PickOrder.jsx |
| `picked` | ❌ No | B (Operational) | PickOrder.jsx |
| `in_production` | ❌ No | B (Operational) | PickOrder.jsx, ProductionView.jsx |
| `production_completed` | ❌ No | B (Operational) | ProductionView.jsx |
| `delivered` | ❌ No | B (Operational) | PickOrder.jsx |
| `cancelled` | ❌ No | Both | SiteDocumentationFlow |
| `shipped` | ❌ No | B (Operational) | syncReservedStock (filter only) |
| `draft` | ❌ No | Both | OrderForm.jsx, processOrderDocument |

---

## 4. Migration Dry-Run Plan

### 4A. Dry-Run Script

Create this function and run it via Base44 console to get actual counts:

```typescript
// base44/functions/analyzeOrderStatuses/entry.ts
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const orders = await base44.asServiceRole.entities.Order.list();
    const workOrders = await base44.asServiceRole.entities.WorkOrder.list();
    const orderItems = await base44.asServiceRole.entities.OrderItem.list();

    // Count by current status
    const statusCounts = {};
    for (const o of orders) {
      const s = o.status || '(null/undefined)';
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    }

    // Analyze each order for mapping ambiguity
    const analysis = {
      total_orders: orders.length,
      by_current_status: statusCounts,
      mapping_preview: [],
      ambiguous: [],
      manual_review: []
    };

    for (const o of orders) {
      const wo = workOrders.find(w => w.order_id === o.id);
      const items = orderItems.filter(i => i.order_id === o.id);
      const allItemsPicked = items.length > 0 && items.every(i => i.status === 'picked');
      const someItemsPicked = items.some(i => i.status === 'picked');

      let proposedPhase = null;
      let proposedFulfillment = null;
      let ambiguity = null;
      let needsReview = false;

      // --- Mapping logic ---
      switch (o.status) {
        case 'SÄLJ':
          proposedPhase = 'SÄLJ';
          proposedFulfillment = 'pending';
          break;
        case 'KONSTRUKTION':
          proposedPhase = 'KONSTRUKTION';
          proposedFulfillment = 'pending';
          break;
        case 'PRODUKTION':
          proposedPhase = 'AKTIV';
          proposedFulfillment = 'pending';
          break;
        case 'LAGER':
          proposedPhase = 'AKTIV';
          // Ambiguity: is it picking or picked?
          if (wo && ['montering', 'leverans'].includes(wo.current_stage)) {
            proposedFulfillment = 'picked';
          } else if (allItemsPicked) {
            proposedFulfillment = 'picked';
          } else if (someItemsPicked) {
            proposedFulfillment = 'picking';
            ambiguity = 'Some items picked but not all; WO stage not advanced';
          } else {
            proposedFulfillment = 'picking';
          }
          break;
        case 'MONTERING':
          if (wo && wo.status === 'klar') {
            proposedPhase = 'AVSLUTAD';
            proposedFulfillment = 'delivered';
          } else if (wo && wo.status === 'pågår' && wo.current_stage === 'montering') {
            proposedPhase = 'AKTIV';
            proposedFulfillment = 'in_transit';
            ambiguity = 'Order.status=MONTERING but WO still in montering stage (not completed)';
          } else {
            proposedPhase = 'AVSLUTAD';
            proposedFulfillment = 'delivered';
            ambiguity = 'No linked WO or WO state unclear';
            needsReview = true;
          }
          break;
        case 'ready_to_pick':
          proposedPhase = 'AKTIV';
          proposedFulfillment = 'ready_to_pick';
          break;
        case 'picking':
          proposedPhase = 'AKTIV';
          proposedFulfillment = 'picking';
          break;
        case 'picked':
          proposedPhase = 'AKTIV';
          proposedFulfillment = 'picked';
          break;
        case 'in_production':
          proposedPhase = 'AKTIV';
          proposedFulfillment = 'picked'; // Build step after picking
          break;
        case 'production_completed':
          proposedPhase = 'AKTIV';
          proposedFulfillment = 'picked'; // Build done, not yet delivered
          break;
        case 'delivered':
          proposedPhase = 'AVSLUTAD';
          proposedFulfillment = 'delivered';
          break;
        case 'cancelled':
          proposedPhase = 'AVBRUTEN';
          proposedFulfillment = 'pending';
          break;
        case 'shipped':
          proposedPhase = 'AKTIV';
          proposedFulfillment = 'in_transit';
          break;
        case 'draft':
          proposedPhase = 'SÄLJ';
          proposedFulfillment = 'pending';
          ambiguity = 'Draft orders should probably be SÄLJ phase';
          break;
        default:
          proposedPhase = 'AKTIV';
          proposedFulfillment = 'pending';
          ambiguity = `Unknown status: ${o.status}`;
          needsReview = true;
      }

      const entry = {
        order_id: o.id,
        order_number: o.order_number,
        current_status: o.status,
        proposed_phase: proposedPhase,
        proposed_fulfillment: proposedFulfillment,
        has_workorder: !!wo,
        wo_status: wo?.status || null,
        wo_stage: wo?.current_stage || null,
        total_items: items.length,
        picked_items: items.filter(i => i.status === 'picked').length,
        ambiguity,
        needs_review: needsReview
      };

      analysis.mapping_preview.push(entry);
      if (ambiguity) analysis.ambiguous.push(entry);
      if (needsReview) analysis.manual_review.push(entry);
    }

    // Summarize proposed mapping
    const proposedPhaseCounts = {};
    const proposedFulfillmentCounts = {};
    for (const e of analysis.mapping_preview) {
      proposedPhaseCounts[e.proposed_phase] = (proposedPhaseCounts[e.proposed_phase] || 0) + 1;
      proposedFulfillmentCounts[e.proposed_fulfillment] = (proposedFulfillmentCounts[e.proposed_fulfillment] || 0) + 1;
    }

    return Response.json({
      success: true,
      summary: {
        total_orders: orders.length,
        by_current_status: statusCounts,
        proposed_phase_counts: proposedPhaseCounts,
        proposed_fulfillment_counts: proposedFulfillmentCounts,
        ambiguous_count: analysis.ambiguous.length,
        manual_review_count: analysis.manual_review.length
      },
      ambiguous: analysis.ambiguous.slice(0, 50), // First 50 for review
      manual_review: analysis.manual_review.slice(0, 50)
    });

  } catch (error) {
    console.error('Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
```

### 4B. Expected Mapping Output (Hypothetical — Run Script to Confirm)

| Current Status | Proposed `phase` | Proposed `fulfillment_status` | Ambiguity? |
|---------------|-----------------|------------------------------|------------|
| `SÄLJ` | `SÄLJ` | `pending` | None |
| `KONSTRUKTION` | `KONSTRUKTION` | `pending` | None |
| `PRODUKTION` | `AKTIV` | `pending` | None (rare value) |
| `LAGER` | `AKTIV` | `picking` or `picked` | **Yes** — depends on items/WO state |
| `MONTERING` | `AVSLUTAD` or `AKTIV` | `delivered` or `in_transit` | **Yes** — depends on WO completion |
| `ready_to_pick` | `AKTIV` | `ready_to_pick` | None |
| `picking` | `AKTIV` | `picking` | None |
| `picked` | `AKTIV` | `picked` | None |
| `in_production` | `AKTIV` | `picked` | None |
| `production_completed` | `AKTIV` | `picked` | None |
| `delivered` | `AVSLUTAD` | `delivered` | None |
| `cancelled` | `AVBRUTEN` | `pending` | None |
| `shipped` | `AKTIV` | `in_transit` | None |
| `draft` | `SÄLJ` | `pending` | Minor — should draft be SÄLJ? |

### 4C. Ambiguous Cases Requiring Logic

| Scenario | Current `status` | Decision Logic | Proposed Mapping |
|----------|-----------------|----------------|-----------------|
| Order has `LAGER` status, linked WO is in `montering` or `leverans` stage | `LAGER` | WO has advanced past lager → picking must be done | `phase: AKTIV`, `fulfillment: picked` |
| Order has `LAGER` status, all OrderItems have `status: 'picked'` | `LAGER` | All items physically picked | `phase: AKTIV`, `fulfillment: picked` |
| Order has `LAGER` status, some items picked, WO still in `lager` | `LAGER` | Picking in progress | `phase: AKTIV`, `fulfillment: picking` |
| Order has `MONTERING` status, linked WO has `status: 'klar'` | `MONTERING` | WO completed → order done | `phase: AVSLUTAD`, `fulfillment: delivered` |
| Order has `MONTERING` status, linked WO has `status: 'pågår'`, `current_stage: 'montering'` | `MONTERING` | WO still installing → not done | `phase: AKTIV`, `fulfillment: in_transit` |
| Order has `MONTERING` status, no linked WO | `MONTERING` | Orphaned — manual review | `phase: AVSLUTAD`, `fulfillment: delivered` + flag for review |

### 4D. Manual Review Flags

Orders flagged for manual review:
1. `status = 'MONTERING'` with no linked WorkOrder
2. `status = 'LAGER'` with partial picking and no clear WO stage
3. Any unknown/unexpected status value not in the mapping table
4. `status = 'draft'` — confirm these should map to `SÄLJ` phase
5. `status = 'PRODUKTION'` — verify if these are legacy or actively used

---

## 5. Base44 Additive Field Safety — Confirmed

### Evidence

| Source | Finding |
|--------|---------|
| `src/AGENTS.md` lines 196-199 | *"All entities are defined as JSON schemas in `entities/`"* — auto-generated `id`, `created_date`, `updated_date` |
| `src/AGENTS.md` lines 339-369 | Full migration system documented, including `MigrationRun` entity for tracking |
| `src/UNIFIED_SCANNING_ARCHITECTURE.md` | Explicit **"SCHEMA-ÄNDRINGAR"** section documenting field additions to `Article`, `Batch`, `ProductionRecord`, `RepairLog` |
| `base44/entities/MigrationRun.jsonc` | Tracks: `migration_name`, `run_date`, `rollback_snapshot`, `rollback_available` |
| `base44/functions/rollbackMigration/entry.ts` | Restores records from snapshot |
| Base44 official docs (via web search) | *"Schema flexibility: You can update your data model at any point without running migrations"* |
| Base44 official docs | *"It does not update or overwrite existing records; it always appends new rows"* |

### How It Works

Base44 uses a **MongoDB-compatible NoSQL database** under the hood:
- Adding a field to the JSON schema = **zero impact on existing records**
- Existing records simply **do not contain the new field** (returns `undefined`)
- Code must handle missing fields via `default` values or defensive checks
- The codebase already uses this pattern extensively (30+ `default` declarations)

### What Happens to Existing Records

| Scenario | Result |
|----------|--------|
| Add `phase` field | Existing orders: `phase === undefined` |
| Add `fulfillment_status` field | Existing orders: `fulfillment_status === undefined` |
| Read old record via SDK | Missing fields are `undefined`, no error |
| Query/filter by new field | Only records with explicit values match |

### Safety Checklist

| Check | Result |
|-------|--------|
| Data loss risk? | **None** — additive only |
| Existing records corrupted? | **No** — untouched |
| Rollback possible? | **Yes** — drop the new fields |
| Requires migration script? | **No** for field addition; **Yes** for data backfill |
| Can add without downtime? | **Yes** — Base44 is serverless |

---

## 6. Exact Proposed Schema Changes

### File to Modify: `base44/entities/Order.jsonc`

Add these two properties to the `properties` object (any position, alphabetically near `status` is logical):

```jsonc
    "fulfillment_status": {
      "type": "string",
      "enum": [
        "pending",
        "ready_to_pick",
        "picking",
        "picked",
        "in_transit",
        "delivered",
        "returned"
      ],
      "default": "pending",
      "description": "Operational fulfillment state — tracks pick/pack/ship/delivery"
    },
    "phase": {
      "type": "string",
      "enum": [
        "SÄLJ",
        "KONSTRUKTION",
        "AKTIV",
        "AVSLUTAD",
        "ARKIVERAD",
        "AVBRUTEN"
      ],
      "default": "SÄLJ",
      "description": "High-level business lifecycle phase"
    },
```

### Full Context (showing insertion point)

```jsonc
{
  "name": "Order",
  "type": "object",
  "properties": {
    // ... existing fields ...
    "financial_status": {
      "type": "string",
      "enum": ["unbilled", "pending_billing", "billed"],
      "default": "unbilled",
      "description": "Ekonomisk status – faktureringsläge"
    },
    "fulfillment_status": {
      "type": "string",
      "enum": ["pending", "ready_to_pick", "picking", "picked", "in_transit", "delivered", "returned"],
      "default": "pending",
      "description": "Operational fulfillment state — tracks pick/pack/ship/delivery"
    },
    "phase": {
      "type": "string",
      "enum": ["SÄLJ", "KONSTRUKTION", "AKTIV", "AVSLUTAD", "ARKIVERAD", "AVBRUTEN"],
      "default": "SÄLJ",
      "description": "High-level business lifecycle phase"
    },
    "status": {
      "type": "string",
      "enum": ["SÄLJ", "KONSTRUKTION", "PRODUKTION", "LAGER", "MONTERING"],
      "default": "SÄLJ",
      "description": "Operativ orderstatus (LEGACY — migrating to phase + fulfillment_status)"
    },
    // ... rest of existing fields ...
  }
}
```

### Note on `status` Field

- **Keep** `status` during transition (do not remove or modify its enum yet)
- Mark description as `LEGACY` to signal deprecation
- Dual-write period: all code writes to both `status` (old) and `phase`+`fulfillment_status` (new)
- Remove `status` only after full frontend cutover and validation

---

## 7. Frontend Impact Summary

### Files Requiring Changes (Grouped by Change Type)

#### A. Read `order.status` → Must Read `order.phase` + `order.fulfillment_status`

| File | Current Read | New Read | Effort |
|------|-------------|----------|--------|
| `OrderDetail.jsx` | `order.status` for phase bar + badge | `order.phase` for phase bar; `order.fulfillment_status` for operational badge | Medium |
| `Orders.jsx` | `order.status` for badge + filters | `order.phase` for phase filters; `order.fulfillment_status` for operational filters | Medium |
| `OrderDashboard.jsx` | `order.status` for exclude | `order.phase` for exclude | Small |
| `HomeIvan.jsx` | `order.status` for pipeline chart | `order.phase` for pipeline | Small |
| `HomeKonstruktor.jsx` | `order.status === 'KONSTRUKTION'` | `order.phase === 'KONSTRUKTION'` | Small |
| `HomeSaljare.jsx` | `order.status === 'SÄLJ'` | `order.phase === 'SÄLJ'` | Small |
| `ArticleDetail.jsx` | `order.status` for linked orders | `order.phase` + `order.fulfillment_status` | Small |
| `SiteDocumentationFlow.jsx` | `order.status` for filter + display | `order.phase` for filter; `order.fulfillment_status` for display | Small |
| `LinkToOrderModal.jsx` | `order.status === 'LAGER'` | `order.fulfillment_status === 'picking' \|\| 'picked'` | Small |
| `StockForecast.jsx` | `item.order.status` | `item.order.fulfillment_status` | Small |
| `WarehouseDashboard.jsx` | `order.status` for counts | `order.fulfillment_status` for counts | Small |
| `OrderDetailModal.jsx` | `order.status` for badge | `order.phase` for badge | Small |
| `Production.jsx` | `order.status` for filters/counts | `order.fulfillment_status` for filters/counts | Small |
| `ProductionView.jsx` | `order.status` for conditional UI | `order.fulfillment_status` for conditional UI | Small |
| `PickOrder.jsx` | `order.status` for conditional UI | `order.fulfillment_status` for conditional UI | Small |

#### B. Write `order.status` → Must Write `order.phase` + `order.fulfillment_status`

| File | Current Write | New Write | Effort |
|------|-------------|-----------|--------|
| `OrderDetail.jsx` | `status: 'KONSTRUKTION'` | `phase: 'KONSTRUKTION'` | Small |
| `PickOrder.jsx` | `status: 'picking'` | `fulfillment_status: 'picking'` | Small |
| `PickOrder.jsx` | `status: 'picked'` | `fulfillment_status: 'picked'` | Small |
| `PickOrder.jsx` | `status: 'delivered'` | `phase: 'AVSLUTAD'`, `fulfillment_status: 'delivered'` | Small |
| `PickOrder.jsx` | `status: 'in_production'` | `fulfillment_status: 'picked'` | Small |
| `ProductionView.jsx` | `status: 'in_production'` | `fulfillment_status: 'picked'` | Small |
| `ProductionView.jsx` | `status: 'production_completed'` | `fulfillment_status: 'picked'` | Small |
| `updateWorkOrderStage` | `status: 'MONTERING'` | `phase: 'AVSLUTAD'`, `fulfillment_status: 'delivered'` | Small |
| `OrderForm.jsx` | `status: order?.status \|\| 'draft'` | `phase: order?.phase \|\| 'SÄLJ'` | Small |
| `processIncomingOrderEmail` | `status: 'ready_to_pick'` | `phase: 'AKTIV'`, `fulfillment_status: 'ready_to_pick'` | Small |
| `processOrderDocument` | `status: 'draft'` | `phase: 'SÄLJ'`, `fulfillment_status: 'pending'` | Small |

#### C. Filters / Dashboards / Counts

| File | Current Filter | New Filter | Effort |
|------|---------------|------------|--------|
| `Orders.jsx` | `statusFilter === 'in_production'` | `fulfillment_status` filter | Small |
| `Orders.jsx` | `statusFilter === 'picking'` | `fulfillment_status` filter | Small |
| `Orders.jsx` | `statusFilter === 'picked'` | `fulfillment_status === 'picked'` | Small |
| `Orders.jsx` | Phase bar index on `order.status` | Phase bar index on `order.phase` | Small |
| `Production.jsx` | `o.status === 'picked'` etc. | `o.fulfillment_status === 'picked'` etc. | Small |
| `exportOrders` | `o.status === 'picked'` | `o.fulfillment_status === 'picked'` | Small |
| `getPublicOrders` | `o.status !== 'SÄLJ'` | `o.phase !== 'SÄLJ'` | Small |
| `syncReservedStock` | `!['delivered','cancelled','shipped']` | `fulfillment_status` check | Small |

### Total Files Affected: **25+ files**

---

## 8. Recommended First Implementation Step

### Step: Deploy the `analyzeOrderStatuses` Dry-Run Function

**Before touching the schema or any frontend code, run the analysis function to see actual data.**

**Why this first:**
1. **Zero risk** — read-only analysis, no writes
2. **Validates assumptions** — we don't know the actual distribution of status values in production
3. **Reveals edge cases** — unknown status values, orphaned records, ambiguous mappings
4. **Informs the migration** — actual counts determine if the mapping logic needs adjustment
5. **Provides rollback data** — the output becomes the baseline for validation

**Exact actions:**
1. Create `base44/functions/analyzeOrderStatuses/entry.ts` (script above)
2. Deploy to Base44
3. Run via Base44 console or invoke from frontend admin page
4. Review output:
   - Total order count
   - Distribution of current `status` values
   - Count of ambiguous cases
   - Count flagged for manual review
5. Adjust mapping logic in the script if edge cases are found
6. Only THEN proceed to schema changes

**After analysis is complete and validated, the next steps would be:**
1. Add `phase` and `fulfillment_status` to `Order.jsonc`
2. Run migration backfill script
3. Begin dual-write on frontend writes
4. Update frontend reads (screen by screen)
5. Eventually deprecate `status`

---

*End of analysis. No files, schema, or data were modified.*
