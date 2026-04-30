/**
 * approveStockWithdrawal
 * Admin approves a pending StockWithdrawal and triggers atomic stock deduction.
 * Optionally allows approver to modify quantities per item.
 */

import { prisma } from '../lib/db.js';

const CORRECTION_REASONS = ['correction', 'inventory_adjustment'];

export async function approveStockWithdrawal(req, res, next) {
  try {
    const user = req.user;
    const payload = req.body;
    const data = payload?.data || payload;
    const { withdrawal_id, approved_quantities } = data;

    if (!withdrawal_id) {
      return res.status(400).json({ error: 'withdrawal_id is required' });
    }

    const withdrawal = await prisma.stockWithdrawal.findUnique({
      where: { id: withdrawal_id },
      include: { items: true },
    });

    if (!withdrawal) {
      return res.status(404).json({ error: 'StockWithdrawal not found' });
    }
    if (withdrawal.status !== 'pending_approval') {
      return res.status(409).json({ error: `Cannot approve from status: ${withdrawal.status}` });
    }

    // Optional quantity overrides: { [item_id]: quantity }
    const qtyOverrides = approved_quantities || {};

    const result = await prisma.$transaction(async (tx) => {
      const articleIds = withdrawal.items.map((i) => i.article_id);
      const articles = await tx.article.findMany({
        where: { id: { in: articleIds } },
      });
      const articleMap = new Map(articles.map((a) => [a.id, a]));

      for (const item of withdrawal.items) {
        const article = articleMap.get(item.article_id);
        if (!article) continue;

        const requestedQty = item.quantity_requested;
        const approvedQty = qtyOverrides[item.id] !== undefined
          ? Math.max(0, Math.min(requestedQty, qtyOverrides[item.id]))
          : requestedQty;

        const currentStock = article.stock_qty ?? 0;
        const isCorrection = CORRECTION_REASONS.includes(item.reason_code);

        if (!isCorrection && currentStock < approvedQty) {
          throw new Error(
            `INSUFFICIENT_STOCK: ${article.name} has ${currentStock}, approved ${approvedQty}`
          );
        }

        // Deduct stock
        await tx.article.update({
          where: { id: item.article_id },
          data: { stock_qty: currentStock - approvedQty },
        });

        // Update item
        await tx.stockWithdrawalItem.update({
          where: { id: item.id },
          data: {
            quantity_approved: approvedQty,
            quantity_withdrawn: approvedQty,
            stock_before: currentStock,
            stock_after: currentStock - approvedQty,
          },
        });

        // Audit trail
        await tx.stockAdjustment.create({
          data: {
            article_id: item.article_id,
            adjustment_type: 'decrease',
            quantity_before: currentStock,
            quantity_after: currentStock - approvedQty,
            quantity_delta: -approvedQty,
            reason: isCorrection ? 'correction' : 'other',
            reason_notes: item.reason_notes || `Approved withdrawal: ${item.reason_code}`,
            adjusted_by: user?.email || 'unknown',
            approved_by: user?.email || 'unknown',
            adjusted_at: new Date(),
          },
        });
      }

      const completed = await tx.stockWithdrawal.update({
        where: { id: withdrawal_id },
        data: {
          status: 'completed',
          approved_by: user?.email || 'unknown',
          approved_at: new Date(),
          completed_by: user?.email || 'unknown',
          completed_at: new Date(),
          updatedAt: new Date(),
        },
        include: { items: true },
      });

      return completed;
    });

    return res.json({
      success: true,
      withdrawal: result,
      message: 'Withdrawal approved and completed',
    });
  } catch (error) {
    if (error.message?.startsWith('INSUFFICIENT_STOCK')) {
      return res.status(409).json({ error: error.message });
    }
    next(error);
  }
}
