# Material Data Analysis & Proposal

## Checkpoint: Where Material Needs Currently Exist

### Finding 1: `WorkOrder.materials_needed` (JSON) — ONLY real source
| | |
|---|---|
| **Rows with data** | **1** of 1 total WorkOrder |
| **Structure** | Array of objects |
| **Item count** | 1 item |
| **Content** | `LED Controller` — quantity 1, in_stock 8, missing 0, needs_purchase false |
| **Assessment** | Real imported CRM data. Already satisfied (stock > need). |

```json
[
  {
    "missing": 0,
    "in_stock": 8,
    "quantity": 1,
    "article_id": "695b9f9fb141b6c682973113",
    "article_name": "LED Controller",
    "batch_number": "VDWALL LVP100U",
    "serial_number": null,
    "shelf_address": "G-03-G",
    "needs_purchase": false
  }
]
```

### Finding 2: `WorkOrderMaterial` table — EMPTY
| | |
|---|---|
| **Total rows** | **0** |
| **Assessment** | The canonical table for Phase 1+ is completely empty. |

### Finding 3: `OrderItem` table — CUSTOMER ORDER LINES
| | |
|---|---|
| **Total rows** | **40** |
| **Purpose** | What the customer ordered (sales lines) |
| **Linked to WorkOrder?** | No direct link. Linked to `Order` via `order_id`. |
| **Assessment** | NOT production material needs. Do NOT use for Material & Inköp. |

### Finding 4: `PurchaseOrder.work_order_id` — UNLINKED
| | |
|---|---|
| **Linked POs** | **0** of 22 total PurchaseOrders |
| **Assessment** | No purchase orders are connected to Work Orders yet. |

### Finding 5: `Order.needs_ordering` / `ordering_completed` — UNUSED
| | |
|---|---|
| **Populated rows** | **0** of 22 total Orders |
| **Assessment** | Legacy flags, completely unused. |

---

## Option A: Read `materials_needed` JSON Directly (No Migration)

### How it works
Extend `getPurchaseNeeds` to read from `WorkOrder.materials_needed` JSON when `WorkOrderMaterial` rows don't exist.

### JSON to PurchaseNeed mapping

| `materials_needed` JSON field | `PurchaseNeed` field | Notes |
|---|---|---|
| `article_id` | `article_id` | Direct mapping |
| `article_name` | `article_name` | Direct mapping |
| `quantity` | `quantity_needed` | Customer-ordered quantity |
| `in_stock` | `quantity_in_stock` | Snapshot from import time |
| `missing` | `quantity_missing` | Direct mapping |
| `needs_purchase` | drives `status` | `false` + `missing:0` -> `received` |
| `batch_number` | ignored or notes | Legacy batch info |
| `shelf_address` | ignored | Already in Article table |

### Pros
- Zero data changes — completely read-only
- Board becomes useful immediately
- No migration risk
- Works for all existing WorkOrders with `materials_needed`

### Cons
- JSON data is a snapshot — `in_stock` may be stale
- No `quantity_picked`, `quantity_ordered`, `quantity_received` in JSON
- Cannot be updated or queried efficiently
- Future WorkOrders may not have this JSON field populated
- Actions in Phase 2 would need to create `WorkOrderMaterial` rows anyway

### Verdict
**Good for Phase 1 display only.** Not sufficient for Phase 2 actions.

---

## Option B: One-Time Migration JSON -> `WorkOrderMaterial` Rows

### Migration script logic
```
for each WorkOrder where materials_needed is not null:
  for each item in materials_needed array:
    create WorkOrderMaterial row:
      work_order_id:      wo.id
      article_id:         item.article_id
      article_name:       item.article_name
      quantity_needed:    item.quantity
      stock_qty_at_check: item.in_stock
      status:             deriveStatus(item)
```

### Status derivation
```
if needs_purchase == false && missing == 0  ->  in_stock
if needs_purchase == true                    ->  purchase_needed
if missing > 0 && in_stock > 0               ->  partially_picked
else                                         ->  not_checked
```

### For the existing data (1 item)
| Field | Value |
|---|---|
| `article_id` | `695b9f9fb141b6c682973113` |
| `article_name` | `LED Controller` |
| `quantity_needed` | `1` |
| `stock_qty_at_check` | `8` |
| `status` | `in_stock` |

### Pros
- Canonical data in proper table
- Board works naturally with existing `getPurchaseNeeds` endpoint
- Ready for Phase 2 actions (update status, link PO, etc.)
- Can query, filter, and index
- Single-row migration — extremely low risk

### Cons
- Requires writing data (but only to an empty table)
- `in_stock` snapshot may be stale (can be refreshed later)

### Safety measures
1. **Pre-flight check:** Verify `WorkOrderMaterial` table is empty before running
2. **Idempotent:** Script checks if row already exists before creating
3. **Backup:** No existing data is modified — only inserts to empty table
4. **Audit:** Log what was created in `WorkOrderActivity`

### Verdict
**Recommended.** Creates 1 row in an empty table. Zero risk to existing data.

---

## Option C: Hybrid — Read JSON Now, Migrate Later

### How it works
1. **Phase 1 (now):** Extend `getPurchaseNeeds` to read JSON as fallback when `WorkOrderMaterial` is empty
2. **Phase 1.5:** Run migration script to create `WorkOrderMaterial` rows from JSON
3. **Phase 2+:** Remove JSON fallback — only read from `WorkOrderMaterial`

### Pros
- Board works immediately without waiting for migration
- Migration can be done separately, tested, and verified
- If migration has issues, the JSON fallback still works

### Cons
- Slightly more complex endpoint (two data sources)
- Temporary complexity until migration completes

### Verdict
**Safest approach.** Gets us value now while keeping migration separate and testable.

---

## Recommendation

**Go with Option C (Hybrid):**

### Step 1 — Extend endpoint (no data changes)
Modify `getPurchaseNeeds` to:
1. First try to read `WorkOrderMaterial` rows (the canonical source)
2. If none exist, fall back to reading `WorkOrder.materials_needed` JSON
3. Map JSON items into the same `PurchaseNeed` shape
4. Return identical response format

### Step 2 — Safe migration (separate, reversible)
Run a one-time Node.js script that:
1. Scans all `WorkOrder.materials_needed` JSON arrays
2. Creates `WorkOrderMaterial` rows for each item
3. Skips if row already exists (idempotent)
4. Logs activity to `WorkOrderActivity`

### Step 3 — Remove fallback (after migration verified)
Remove JSON fallback from `getPurchaseNeeds`. Only read from `WorkOrderMaterial`.

---

## Expected Result After Step 1

For the existing WorkOrder (`ORD-2026-001`, Axel Arigato):

```
+---------------------------------------------------------+
|  MATERIAL & INKÖP                                       |
+---------------------------------------------------------+
|  +--------+--------+----------+----------+-----------+  |
|  |Totalt 1|Klara 1 |Beställt 0|Saknas 0  |Försenat 0 |  |
|  +--------+--------+----------+----------+-----------+  |
|                                                         |
|  ✅ KLAR                                                |
|  +--------------------------------------------------+  |
|  | LED Controller                                   |  |
|  |   Behov: 1  |  Lager: 8  |  Saknas: 0          |  |
|  |   Plockat: 0  |  Mottaget: 0                    |  |
|  |   Blockerar: Nej                                 |  |
|  +--------------------------------------------------+  |
|                                                         |
+---------------------------------------------------------+
```

The board will show **real imported data** — the LED Controller with its stock status.
