/**
 * logWorkOrderActivity
 * Creates a WorkOrderActivity audit log entry.
 */

import { prisma } from '../lib/db.js';

const STATUS_LABELS = {
  pending: 'Väntande',
  in_progress: 'Pågår',
  completed: 'Klar',
  cancelled: 'Avbokad',
  picking: 'Plockning',
  production: 'Produktion',
  delivery: 'Leverans',
  started: 'Startad',
  assembled: 'Monterad',
  tested: 'Testad',
  v_ntande: 'Väntande',
  p_b_rjad: 'Påbörjad',
  klar: 'Klar',
};

export async function logWorkOrderActivity(req, res, next) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      work_order_id,
      type,
      message,
      field_name,
      old_value,
      new_value,
      is_decision,
      decision_reason,
      file_url,
      file_name,
      metadata,
    } = req.body;

    if (!work_order_id || !type || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let displayOldValue = old_value;
    let displayNewValue = new_value;
    if (field_name === 'status' || field_name === 'current_stage') {
      displayOldValue = STATUS_LABELS[old_value] || old_value;
      displayNewValue = STATUS_LABELS[new_value] || new_value;
    }

    const activity = await prisma.workOrderActivity.create({
      data: {
        work_order_id,
        type,
        message,
        field_name: field_name || null,
        old_value: displayOldValue || null,
        new_value: displayNewValue || null,
        actor_email: user.email,
        actor_name: user.full_name || user.email,
        is_decision: is_decision || false,
        decision_reason: decision_reason || null,
        file_url: file_url || null,
        file_name: file_name || null,
        metadata: metadata || null,
      },
    });

    return res.json({ activity });
  } catch (error) {
    next(error);
  }
}
