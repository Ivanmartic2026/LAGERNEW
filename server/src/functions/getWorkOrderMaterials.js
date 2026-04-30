import { prisma } from '../lib/db.js';

/**
 * getWorkOrderMaterials
 * Returns all material lines for a Work Order with enriched data:
 * - Current stock quantity from Article
 * - Linked Purchase Order status
 * - Computed readiness flags
 *
 * Body: { work_order_id: string }
 */
export async function getWorkOrderMaterials(req, res) {
  try {
    const { work_order_id } = req.body;

    if (!work_order_id) {
      return res.status(400).json({ success: false, error: 'work_order_id is required' });
    }

    // Fetch material lines
    const materials = await prisma.workOrderMaterial.findMany({
      where: { work_order_id },
      orderBy: { createdAt: 'asc' },
    });

    // Enrich with stock data and PO status
    const enriched = await Promise.all(
      materials.map(async (m) => {
        let stockQty = null;
        let poStatus = null;
        let poNumber = null;
        let poExpectedDelivery = null;

        if (m.article_id) {
          const article = await prisma.article.findUnique({
            where: { id: m.article_id },
            select: { stock_qty: true },
          });
          stockQty = article?.stock_qty ?? null;
        }

        if (m.purchase_order_id) {
          const po = await prisma.purchaseOrder.findUnique({
            where: { id: m.purchase_order_id },
            select: { status: true, po_number: true, expected_delivery_date: true },
          });
          if (po) {
            poStatus = po.status;
            poNumber = po.po_number;
            poExpectedDelivery = po.expected_delivery_date;
          }
        }

        return {
          ...m,
          stock_qty: stockQty,
          purchase_order_status: poStatus,
          purchase_order_number: poNumber || m.purchase_order_number,
          purchase_order_expected_delivery: poExpectedDelivery || m.expected_delivery,
        };
      })
    );

    // Summary counts
    const summary = {
      total: enriched.length,
      ready: enriched.filter(m => m.status === 'in_stock' || m.status === 'picked').length,
      ordered: enriched.filter(m => m.status === 'ordered' || m.status === 'partially_received' || m.status === 'received').length,
      missing: enriched.filter(m => m.status === 'not_ordered' || m.status === 'purchase_needed' || m.status === 'not_checked').length,
      picked: enriched.filter(m => m.status === 'picked' || m.status === 'partially_picked').length,
    };

    return res.json({
      success: true,
      materials: enriched,
      summary,
    });
  } catch (error) {
    console.error('[getWorkOrderMaterials] Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
