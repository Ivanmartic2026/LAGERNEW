/**
 * createWorkOrder
 * Creates a WorkOrder from an existing Order, mapping fields and
 * computing materials_needed from OrderItems + Articles.
 */

import { prisma } from '../lib/db.js';

const PRIORITY_MAP = {
  låg: 'låg',
  low: 'låg',
  normal: 'normal',
  hög: 'hög',
  high: 'hög',
  brådskande: 'brådskande',
  urgent: 'brådskande',
};

export async function createWorkOrder(req, res, next) {
  try {
    const payload = req.body;

    // Called from automation or directly
    const orderId = payload?.order_id || payload?.data?.id || payload?.event?.entity_id;
    if (!orderId) {
      return res.status(400).json({ error: 'Missing order_id' });
    }

    // Fetch the order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if a WorkOrder already exists for this order
    const existing = await prisma.workOrder.findFirst({
      where: { order_id: orderId },
    });
    if (existing) {
      console.log(`WorkOrder already exists for order ${orderId}`);
      return res.json({ success: true, workOrder: existing, created: false });
    }

    // Map order priority to Swedish values
    const priority = PRIORITY_MAP[order.priority?.toLowerCase()] || 'normal';

    // Auto-generate order_number if missing
    let orderNumber = order.order_number;
    if (!orderNumber) {
      const year = new Date().getFullYear();
      const allWOs = await prisma.workOrder.findMany({
        where: { order_number: { startsWith: `ORD-${year}` } },
      });
      const count = allWOs.length;
      orderNumber = `ORD-${year}-${String(count + 1).padStart(3, '0')}`;
    }

    // Fetch OrderItems and Articles to populate materials_needed
    const orderItems = await prisma.orderItem.findMany({
      where: { order_id: orderId },
    });

    const articleIds = orderItems.map((item) => item.article_id).filter(Boolean);
    const articles = articleIds.length > 0
      ? await prisma.article.findMany({ where: { id: { in: articleIds } } })
      : [];

    const articleMap = new Map(articles.map((a) => [a.id, a]));

    const materialsNeeded = (orderItems || []).map((item) => {
      const article = articleMap.get(item.article_id);
      const inStock = article?.stock_qty || 0;
      const quantity = item.quantity_ordered || 0;
      const missing = Math.max(0, quantity - inStock);
      const shelfAddr = item.shelf_address || (article?.shelf_address?.[0] ?? '');
      return {
        article_id: item.article_id,
        article_name: item.article_name || article?.name || '',
        batch_number: item.article_batch_number || article?.batch_number || '',
        shelf_address: shelfAddr,
        quantity,
        in_stock: inStock,
        missing,
        needs_purchase: missing > 0,
      };
    });

    // Create the WorkOrder with standardized Swedish values
    const workOrder = await prisma.workOrder.create({
      data: {
        order_id: orderId,
        order_number: orderNumber,
        customer_name: order.customer_name || '',
        customer_reference: order.customer_reference || '',
        fortnox_customer_number: order.fortnox_customer_number || null,
        fortnox_project_number: order.fortnox_project_number || null,
        fortnox_project_name: order.fortnox_project_name || null,
        rm_system_id: order.rm_system_id || null,
        rm_system_url: order.rm_system_url || null,
        delivery_date: order.delivery_date || null,
        delivery_address: order.delivery_address || null,
        delivery_method: order.delivery_method || null,
        delivery_contact_name: order.delivery_contact_name || null,
        delivery_contact_phone: order.delivery_contact_phone || null,
        installation_date: order.installation_date || null,
        installation_type: order.installation_type || null,
        screen_dimensions: order.screen_dimensions || null,
        pixel_pitch: order.pixel_pitch || null,
        module_count: order.module_count || null,
        critical_notes: order.critical_notes || null,
        notes: order.notes || null,
        production_notes: order.notes || '',
        site_ids: order.site_ids || [],
        site_names: order.site_names || [],
        site_visit_info: order.site_visit_info || null,
        source_document_url: order.source_document_url || null,
        uploaded_files: order.uploaded_files || [],
        current_stage: 'konstruktion',
        status: 'v_ntande',
        priority,
        materials_needed: materialsNeeded,
        all_materials_ready: materialsNeeded.length === 0 || materialsNeeded.every((m) => !m.needs_purchase),
      },
    });

    console.log(`WorkOrder created: ${workOrder.id} for order ${orderId} with number: ${orderNumber}`);
    return res.json({ success: true, workOrder, created: true });
  } catch (error) {
    next(error);
  }
}
