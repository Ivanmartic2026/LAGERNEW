import { prisma } from '../index.js';
import { evaluateGates } from '../services/gateService.js';

/**
 * getGateChecklist — Hämta gate-checklista för en fas
 * Body: { work_order_id, phase }
 */
export async function getGateChecklist(req, res, next) {
  try {
    const { work_order_id, phase } = req.body;
    if (!work_order_id || !phase) {
      return res.status(400).json({ error: 'work_order_id and phase required' });
    }

    const result = await evaluateGates(work_order_id, phase);

    return res.json({
      success: true,
      phase,
      items: result.items,
      summary: {
        completed: result.completed,
        total: result.total,
        hardBlockers: result.hardBlockers,
        softBlockers: result.softBlockers,
        allHardMet: result.allHardMet,
        allMet: result.allMet,
      },
    });
  } catch (err) {
    next(err);
  }
}
