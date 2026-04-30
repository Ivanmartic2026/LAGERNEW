/**
 * submitStockWithdrawal
 * Submits a draft StockWithdrawal.
 * - If requires_approval → pending_approval
 * - Otherwise → deduct stock atomically and mark completed
 */

import { prisma } from '../lib/db.js';

const CORRECTION_REASONS = ['correction', 'inventory_adjustment'];

export async function submitStockWithdrawal(req, res, next) {
  try {
    const user = req.user;
    const payload = req.body;
    const data = payload?.data || payload;
    const { withdrawal_id } = data;

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
    if (withdrawal.status !== 'draft') {
      return res.status(409).json({ error: `Cannot submit from status: ${withdrawal.status}` });
    }

    // If approval is required, just change status
    if (withdrawal.requires_approval) {
      const updated = await prisma.stockWithdrawal.update({
        where: { id: withdrawal_id },
        data: {
          status: 'pending_approval',
          updatedAt: new Date(),
        },
        include: { items: true },
      });

      return res.json({
        success: true,
        withdrawal: updated,
        message: 'Withdrawal submitted for approval',
      });
    }

    // No approval needed — deduct stock atomically for all items
    const result = await prisma.$transaction(async (tx) => {
      // Fetch fresh article data
      const articleIds = withdrawal.items.map((i) => i.article_id);
      const articles = await tx.article.findMany({
        where: { id: { in: articleIds } },
      });
      const articleMap = new Map(articles.map((a) => [a.id, a]));

      for (const item of withdrawal.items) {
        const article = articleMap.get(item.article_id);
        if (!article) continue;

        const currentStock = article.stock_qty ?? 0;
        const isCorrection = CORRECTION_REASONS.includes(item.reason_code);

        if (!isCorrection && currentStock < item.quantity_requested) {
          throw new Error(
            `INSUFFICIENT_STOCK: ${article.name} (${article.id}) has ${currentStock}, requested ${item.quantity_requested}`
          );
        }

        // Update article stock
        await tx.article.update({
          where: { id: item.article_id },
          data: { stock_qty: currentStock - item.quantity_requested },
        });

        // Update item with actuals
        await tx.stockWithdrawalItem.update({
          where: { id: item.id },
          data: {
            quantity_approved: item.quantity_requested,
            quantity_withdrawn: item.quantity_requested,
            stock_before: currentStock,
            stock_after: currentStock - item.quantity_requested,
          },
        });

        // Create StockAdjustment audit record
        await tx.stockAdjustment.create({
          data: {
            article_id: item.article_id,
            adjustment_type: 'decrease',
            quantity_before: currentStock,
            quantity_after: currentStock - item.quantity_requested,
            quantity_delta: -item.quantity_requested,
            reason: isCorrection ? 'correction' : 'other',
            reason_notes: item.reason_notes || `Withdrawal: ${item.reason_code}`,
            adjusted_by: user?.email || 'unknown',
            adjusted_at: new Date(),
          },
        });
      }

      // Mark withdrawal completed
      const completed = await tx.stockWithdrawal.update({
        where: { id: withdrawal_id },
        data: {
          status: 'completed',
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
      message: 'Withdrawal completed',
    });
  } catch (error) {
    if (error.message?.startsWith('INSUFFICIENT_STOCK')) {
      return res.status(409).json({ error: error.message });
    }
    next(error);
  }
}
