/**
 * rejectStockWithdrawal
 * Admin rejects a pending StockWithdrawal.
 */

import { prisma } from '../lib/db.js';

export async function rejectStockWithdrawal(req, res, next) {
  try {
    const user = req.user;
    const payload = req.body;
    const data = payload?.data || payload;
    const { withdrawal_id, rejection_reason } = data;

    if (!withdrawal_id) {
      return res.status(400).json({ error: 'withdrawal_id is required' });
    }

    const withdrawal = await prisma.stockWithdrawal.findUnique({
      where: { id: withdrawal_id },
    });

    if (!withdrawal) {
      return res.status(404).json({ error: 'StockWithdrawal not found' });
    }
    if (!['draft', 'pending_approval'].includes(withdrawal.status)) {
      return res.status(409).json({ error: `Cannot reject from status: ${withdrawal.status}` });
    }

    const updated = await prisma.stockWithdrawal.update({
      where: { id: withdrawal_id },
      data: {
        status: 'rejected',
        approved_by: user?.email || 'unknown',
        approved_at: new Date(),
        rejection_reason: rejection_reason || null,
        updatedAt: new Date(),
      },
      include: { items: true },
    });

    return res.json({
      success: true,
      withdrawal: updated,
      message: 'Withdrawal rejected',
    });
  } catch (error) {
    next(error);
  }
}
