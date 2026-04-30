/**
 * quickStockWithdrawal
 * Immediate single-item stock withdrawal (Flow A).
 * Deducts stock atomically and creates a completed StockWithdrawal record.
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

const CORRECTION_REASONS = ['correction', 'inventory_adjustment'];

export async function quickStockWithdrawal(req, res, next) {
  try {
    const user = req.user;
    const payload = req.body;
    const data = payload?.data || payload;

    const {
      article_id,
      quantity,
      reason_code,
      notes,
      linked_order_id,
      linked_work_order_id,
    } = data;

    // ─── Validation ───────────────────────────────────────────────
    if (!article_id) {
      return res.status(400).json({ error: 'article_id is required' });
    }
    if (!quantity || quantity <= 0) {
      return res.status(400).json({ error: 'quantity must be greater than 0' });
    }
    if (!reason_code || !ALLOWED_REASONS.includes(reason_code)) {
      return res.status(400).json({ error: `reason_code must be one of: ${ALLOWED_REASONS.join(', ')}` });
    }

    const article = await prisma.article.findUnique({
      where: { id: article_id },
    });
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    const currentStock = article.stock_qty ?? 0;
    const isCorrection = CORRECTION_REASONS.includes(reason_code);

    if (!isCorrection && currentStock < quantity) {
      return res.status(409).json({
        error: 'Insufficient stock',
        requested: quantity,
        available: currentStock,
        article_name: article.name,
      });
    }

    // ─── Atomic stock deduction ───────────────────────────────────
    const newStock = currentStock - quantity;
    const unitCost = article.unit_cost ?? 0;
    const shelfAddress = article.shelf_address?.[0] ?? '';

    const result = await prisma.$transaction(async (tx) => {
      // Lock and verify stock in transaction
      const lockedArticle = await tx.article.findUnique({
        where: { id: article_id },
      });
      const lockedStock = lockedArticle.stock_qty ?? 0;

      if (!isCorrection && lockedStock < quantity) {
        throw new Error(`INSUFFICIENT_STOCK: ${lockedStock} < ${quantity}`);
      }

      // Deduct stock
      await tx.article.update({
        where: { id: article_id },
        data: { stock_qty: lockedStock - quantity },
      });

      // Determine withdrawal type from reason
      const withdrawalType =
        reason_code === 'production'
          ? 'production_material'
          : reason_code === 'spare_part'
          ? 'spare_part'
          : reason_code === 'damaged' || reason_code === 'scrap'
          ? 'scrap'
          : reason_code === 'correction' || reason_code === 'inventory_adjustment'
          ? 'adjustment'
          : 'internal_use';

      // Create StockWithdrawal (completed immediately)
      const withdrawal = await tx.stockWithdrawal.create({
        data: {
          withdrawal_type: withdrawalType,
          status: 'completed',
          linked_order_id: linked_order_id || null,
          linked_work_order_id: linked_work_order_id || null,
          requested_by: user?.email || 'unknown',
          completed_by: user?.email || 'unknown',
          completed_at: new Date(),
          total_value_estimated: unitCost * quantity,
          requires_approval: false,
          notes: notes || null,
          items: {
            create: {
              article_id,
              article_name: article.name,
              unit_cost: unitCost,
              shelf_address: shelfAddress,
              quantity_requested: quantity,
              quantity_approved: quantity,
              quantity_withdrawn: quantity,
              reason_code,
              reason_notes: notes || null,
              stock_before: lockedStock,
              stock_after: lockedStock - quantity,
            },
          },
        },
        include: { items: true },
      });

      // Also create a StockAdjustment record for the audit trail
      await tx.stockAdjustment.create({
        data: {
          article_id,
          adjustment_type: 'decrease',
          quantity_before: lockedStock,
          quantity_after: lockedStock - quantity,
          quantity_delta: -quantity,
          reason: isCorrection ? 'correction' : 'other',
          reason_notes: notes || `Quick withdrawal: ${reason_code}`,
          adjusted_by: user?.email || 'unknown',
          adjusted_at: new Date(),
        },
      });

      return { withdrawal, newStock: lockedStock - quantity };
    });

    return res.json({
      success: true,
      withdrawal: result.withdrawal,
      article: {
        id: article_id,
        name: article.name,
        stock_qty: result.newStock,
      },
    });
  } catch (error) {
    if (error.message?.startsWith('INSUFFICIENT_STOCK')) {
      return res.status(409).json({ error: 'Insufficient stock (concurrent modification)' });
    }
    next(error);
  }
}
