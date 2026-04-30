import { prisma } from '../lib/db.js';

/**
 * getPurchaseNeeds
 * Computes purchase needs for a Work Order from existing data.
 *
 * Step 1 (Option C — Hybrid):
 *   1. Try to read WorkOrderMaterial rows (canonical source)
 *   2. If empty, fall back to WorkOrder.materials_needed JSON
 *   3. Map either source into the same PurchaseNeed response shape
 *
 * Phase 2: Will read from persisted PurchaseNeed table + auto-create on changes.
 *
 * Body: { work_order_id: string }
 */
export async function getPurchaseNeeds(req, res) {
  try {
    const { work_order_id } = req.body;

    if (!work_order_id) {
      return res.status(400).json({ success: false, error: 'work_order_id is required' });
    }

    // ── Step 1: Try canonical source ──
    const materials = await prisma.workOrderMaterial.findMany({
      where: { work_order_id },
      orderBy: { createdAt: 'asc' },
    });

    let needs;

    if (materials.length > 0) {
      // Canonical source exists — enrich WorkOrderMaterial rows
      needs = await buildNeedsFromMaterials(materials, work_order_id);
    } else {
      // ── Step 2: Fallback to WorkOrder.materials_needed JSON ──
      const workOrder = await prisma.workOrder.findUnique({
        where: { id: work_order_id },
        select: { materials_needed: true },
      });

      const jsonItems = Array.isArray(workOrder?.materials_needed)
        ? workOrder.materials_needed
        : [];

      needs = await buildNeedsFromJson(jsonItems, work_order_id);
    }

    // ── Summary counts ──
    const summary = {
      total: needs.length,
      ready: needs.filter((n) => n.status === 'received' || n.status === 'not_needed').length,
      ordered: needs.filter((n) => n.status === 'ordered').length,
      waiting: needs.filter((n) => n.status === 'quote_requested' || n.status === 'quote_received').length,
      missing: needs.filter((n) => n.status === 'purchase_needed').length,
      delayed: needs.filter((n) => n.status === 'delayed').length,
      partially_received: needs.filter((n) => n.status === 'partially_received').length,
      blocking: needs.filter((n) => n.is_blocking).length,
    };

    // ── Work Order blocking state ──
    const blockingNeeds = needs.filter((n) => n.is_blocking);
    const workOrderBlocked = {
      is_blocked: blockingNeeds.length > 0,
      reason:
        blockingNeeds.length > 0
          ? `Saknar: ${blockingNeeds.map((n) => n.article_name).join(', ')}`
          : null,
      blocking_count: blockingNeeds.length,
    };

    return res.json({
      success: true,
      needs,
      summary,
      blocking: workOrderBlocked,
    });
  } catch (error) {
    console.error('[getPurchaseNeeds] Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

// ───────────────────────────────────────────────────────────────
// Build PurchaseNeeds from WorkOrderMaterial rows (canonical)
// ───────────────────────────────────────────────────────────────
async function buildNeedsFromMaterials(materials, work_order_id) {
  return Promise.all(
    materials.map(async (m) => {
      // Look up current stock from Article
      let stockQty = 0;
      let articleSupplierName = null;
      if (m.article_id) {
        const article = await prisma.article.findUnique({
          where: { id: m.article_id },
          select: { stock_qty: true, supplier_name: true },
        });
        stockQty = article?.stock_qty ?? 0;
        articleSupplierName = article?.supplier_name ?? null;
      }

      const reservedQty = m.quantity_reserved ?? 0;
      const receivedQty = m.quantity_received ?? 0;

      const missingQty = Math.max(
        0,
        m.quantity_needed - stockQty - reservedQty - receivedQty
      );

      const { derivedStatus, poExpectedDelivery, poNumber, supplierName, daysDelayed } =
        await deriveStatusFromMaterial(m, missingQty);

      const isBlocking =
        missingQty > 0 &&
        !['received', 'not_needed', 'cancelled'].includes(derivedStatus);

      return {
        id: m.id,
        work_order_id,
        work_order_material_id: m.id,
        order_id: null,

        article_id: m.article_id,
        article_name: m.article_name,
        article_sku: m.article_sku,

        quantity_needed: m.quantity_needed,
        quantity_in_stock: stockQty,
        quantity_reserved: reservedQty,
        quantity_missing: missingQty,
        quantity_ordered: m.quantity_ordered ?? 0,
        quantity_received: receivedQty,

        status: derivedStatus,

        purchase_order_id: m.purchase_order_id,
        purchase_order_number: poNumber,
        supplier_name: supplierName,
        expected_delivery_date: poExpectedDelivery || m.expected_delivery,

        is_blocking: isBlocking,
        blocker_reason: isBlocking
          ? `${m.article_name}: saknas ${missingQty} st`
          : null,

        days_delayed: daysDelayed,

        notes: m.notes,
      };
    })
  );
}

// ───────────────────────────────────────────────────────────────
// Build PurchaseNeeds from materials_needed JSON (fallback)
// ───────────────────────────────────────────────────────────────
async function buildNeedsFromJson(jsonItems, work_order_id) {
  return Promise.all(
    jsonItems.map(async (item, index) => {
      // Look up current stock from Article (JSON in_stock may be stale)
      let stockQty = item.in_stock ?? 0;
      let articleSupplierName = null;
      if (item.article_id) {
        const article = await prisma.article.findUnique({
          where: { id: item.article_id },
          select: { stock_qty: true, supplier_name: true },
        });
        // Prefer live stock if article exists; fall back to JSON snapshot
        stockQty = article?.stock_qty ?? item.in_stock ?? 0;
        articleSupplierName = article?.supplier_name ?? null;
      }

      const neededQty = item.quantity ?? 0;
      const missingQty = item.missing ?? Math.max(0, neededQty - stockQty);

      // Derive status from JSON fields
      let derivedStatus;
      if (item.needs_purchase === false && missingQty === 0) {
        derivedStatus = 'received';
      } else if (item.needs_purchase === true) {
        derivedStatus = 'purchase_needed';
      } else if (missingQty > 0 && stockQty > 0) {
        derivedStatus = 'partially_received';
      } else {
        derivedStatus = 'not_checked';
      }

      const isBlocking =
        missingQty > 0 &&
        !['received', 'not_needed', 'cancelled'].includes(derivedStatus);

      return {
        id: `json-${index}`, // Synthetic id for JSON-sourced items
        work_order_id,
        work_order_material_id: null,
        order_id: null,

        article_id: item.article_id ?? null,
        article_name: item.article_name ?? 'Okänd artikel',
        article_sku: null,

        quantity_needed: neededQty,
        quantity_in_stock: stockQty,
        quantity_reserved: 0,
        quantity_missing: missingQty,
        quantity_ordered: 0,
        quantity_received: 0,

        status: derivedStatus,

        purchase_order_id: null,
        purchase_order_number: null,
        supplier_name: articleSupplierName,
        expected_delivery_date: null,

        is_blocking: isBlocking,
        blocker_reason: isBlocking
          ? `${item.article_name ?? 'Artikel'}: saknas ${missingQty} st`
          : null,

        days_delayed: null,

        notes: item.batch_number
          ? `Batch: ${item.batch_number}${item.shelf_address ? ', Hylla: ' + item.shelf_address : ''}`
          : null,
      };
    })
  );
}

// ───────────────────────────────────────────────────────────────
// Shared: Derive status from WorkOrderMaterial + PO lookup
// ───────────────────────────────────────────────────────────────
async function deriveStatusFromMaterial(m, missingQty) {
  const statusMap = {
    not_checked: 'purchase_needed',
    in_stock: missingQty > 0 ? 'purchase_needed' : 'received',
    partially_picked: missingQty > 0 ? 'purchase_needed' : 'received',
    picked: 'received',
    not_ordered: 'purchase_needed',
    purchase_needed: 'purchase_needed',
    ordered: 'ordered',
    partially_received: 'partially_received',
    received: 'received',
    cancelled: 'cancelled',
    not_needed: 'not_needed',
  };

  let derivedStatus = statusMap[m.status] || 'purchase_needed';

  let isDelayed = false;
  let poExpectedDelivery = null;
  let poNumber = m.purchase_order_number ?? null;
  let supplierName = m.supplier_name ?? null;

  if (m.purchase_order_id) {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: m.purchase_order_id },
      select: {
        is_delayed: true,
        expected_delivery_date: true,
        po_number: true,
        supplier_name: true,
        status: true,
      },
    });
    if (po) {
      isDelayed = po.is_delayed ?? false;
      poExpectedDelivery = po.expected_delivery_date;
      if (po.po_number) poNumber = po.po_number;
      if (po.supplier_name) supplierName = po.supplier_name;

      if (po.status === 'received' && derivedStatus === 'ordered') {
        derivedStatus = 'received';
      }
    }
  }

  if (isDelayed && !['received', 'not_needed', 'cancelled'].includes(derivedStatus)) {
    derivedStatus = 'delayed';
  }

  let daysDelayed = null;
  if (derivedStatus === 'delayed' && poExpectedDelivery) {
    const eta = new Date(poExpectedDelivery);
    const now = new Date();
    const diffMs = now - eta;
    daysDelayed = diffMs > 0 ? Math.ceil(diffMs / (1000 * 60 * 60 * 24)) : 0;
  }

  return { derivedStatus, poExpectedDelivery, poNumber, supplierName, daysDelayed };
}
