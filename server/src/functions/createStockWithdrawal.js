/**
 * createStockWithdrawal
 * Creates a multi-item StockWithdrawal in draft status (Flow B).
 */

import { prisma } from '../lib/db.js';

const ALLOWED_REASONS = [
  'internal_use',
  'spare_part',
  'damaged',
  'scrap',
  'correction',
  'inventory_adjustment',
  'production',
];

export async function createStockWithdrawal(req, res, next) {
  try {
    const user = req.user;
    const payload = req.body;
    const data = payload?.data || payload;

    const {
      items,
      withdrawal_type,
      notes,
      linked_order_id,
      linked_work_order_id,
    } = data;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array is required and must not be empty' });
    }

    // Validate each item
    for (const [idx, item] of items.entries()) {
      if (!item.article_id) {
        return res.status(400).json({ error: `Item ${idx}: article_id is required` });
      }
      if (!item.quantity_requested || item.quantity_requested <= 0) {
        return res.status(400).json({ error: `Item ${idx}: quantity_requested must be > 0` });
      }
      if (!item.reason_code || !ALLOWED_REASONS.includes(item.reason_code)) {
        return res.status(400).json({
          error: `Item ${idx}: reason_code must be one of: ${ALLOWED_REASONS.join(', ')}`,
        });
      }
    }

    // Fetch articles to snapshot names, costs, and calculate total value
    const articleIds = items.map((i) => i.article_id);
    const articles = await prisma.article.findMany({
      where: { id: { in: articleIds } },
    });
    const articleMap = new Map(articles.map((a) => [a.id, a]));

    let totalValue = 0;
    const itemCreates = items.map((item) => {
      const article = articleMap.get(item.article_id);
      const unitCost = article?.unit_cost ?? 0;
      totalValue += unitCost * item.quantity_requested;

      return {
        article_id: item.article_id,
        article_name: article?.name || item.article_name || '',
        unit_cost: unitCost,
        batch_id: item.batch_id || null,
        batch_number: item.batch_number || null,
        shelf_address: article?.shelf_address?.[0] ?? item.shelf_address ?? '',
        quantity_requested: item.quantity_requested,
        reason_code: item.reason_code,
        reason_notes: item.reason_notes || null,
      };
    });

    const DEFAULT_THRESHOLD = 5000;
    const requiresApproval = totalValue >= DEFAULT_THRESHOLD;

    const withdrawal = await prisma.stockWithdrawal.create({
      data: {
        withdrawal_type: withdrawal_type || 'internal_use',
        status: 'draft',
        linked_order_id: linked_order_id || null,
        linked_work_order_id: linked_work_order_id || null,
        requested_by: user?.email || 'unknown',
        total_value_estimated: totalValue,
        approval_threshold: DEFAULT_THRESHOLD,
        requires_approval: requiresApproval,
        notes: notes || null,
        items: { create: itemCreates },
      },
      include: { items: true },
    });

    return res.json({ success: true, withdrawal });
  } catch (error) {
    next(error);
  }
}
