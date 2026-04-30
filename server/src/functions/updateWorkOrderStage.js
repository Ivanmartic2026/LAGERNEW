/**
 * updateWorkOrderStage
 * Handles stage transitions for WorkOrders with validation, timestamps,
 * linked Order updates, and activity logging.
 */

import { prisma } from '../lib/db.js';

const STAGE_ORDER = ['konstruktion', 'produktion', 'lager', 'montering', 'leverans'];

const STAGE_LABELS = {
  konstruktion: 'Konstruktion',
  produktion: 'Produktion',
  lager: 'Lager',
  montering: 'Montering',
  leverans: 'Leverans',
  completed: 'Slutförd',
};

const STAGE_GATES = {
  lager: [
    { field: 'picked', label: 'Plockat' },
  ],
  montering: [
    { field: 'assembled', label: 'Monterat' },
    { field: 'tested', label: 'Testat' },
  ],
  leverans: [
    { field: 'packed', label: 'Paketerat' },
    { field: 'ready_for_delivery', label: 'Redo för leverans' },
  ],
};

const STAGE_TIMESTAMPS = {
  produktion: 'production_started_date',
  lager: 'picking_started_date',
  montering: 'picking_completed_date',
  leverans: 'production_completed_date',
  completed: 'production_completed_date',
};

function getTransitionType(current, target) {
  if (target === 'completed') {
    return current === 'leverans' ? 'forward' : 'invalid';
  }
  const currentIdx = STAGE_ORDER.indexOf(current);
  const targetIdx = STAGE_ORDER.indexOf(target);
  if (currentIdx === -1 || targetIdx === -1) return 'invalid';
  if (currentIdx === targetIdx) return 'same';
  if (targetIdx === currentIdx + 1) return 'forward';
  if (targetIdx === currentIdx - 1) return 'backward';
  return 'invalid';
}

function validateGates(workOrder, stage) {
  const gates = STAGE_GATES[stage] || [];
  const checklist = workOrder.checklist || {};
  const incomplete = gates.filter((g) => !checklist[g.field]);
  return { valid: incomplete.length === 0, incomplete };
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function updateWorkOrderStage(req, res, next) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { work_order_id, target_stage } = req.body;
    if (!work_order_id || !target_stage) {
      return res.status(400).json({
        error: 'Missing required fields: work_order_id, target_stage',
      });
    }

    // Fetch WorkOrder
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: work_order_id },
    });
    if (!workOrder) {
      return res.status(404).json({ error: 'WorkOrder not found' });
    }

    const currentStage = workOrder.current_stage;
    const transition = getTransitionType(currentStage, target_stage);

    // Validate transition
    if (transition === 'invalid') {
      const currentIdx = STAGE_ORDER.indexOf(currentStage);
      const allowedForward = currentIdx >= 0 && currentIdx < STAGE_ORDER.length - 1
        ? [STAGE_ORDER[currentIdx + 1]]
        : [];
      const allowedBackward = currentIdx > 0 ? [STAGE_ORDER[currentIdx - 1]] : [];

      return res.status(400).json({
        error: `Invalid transition: cannot move from "${currentStage}" to "${target_stage}"`,
        current_stage: currentStage,
        allowed_next_stages: [...allowedForward, ...allowedBackward],
      });
    }

    if (transition === 'same') {
      return res.json({
        success: true,
        workOrder,
        message: 'Already at this stage',
        previous_stage: currentStage,
        new_stage: currentStage,
      });
    }

    // Validate gates for forward transitions
    if (transition === 'forward') {
      const gateCheck = validateGates(workOrder, currentStage);
      if (!gateCheck.valid) {
        return res.status(400).json({
          error: 'Stage gates incomplete',
          incomplete_gates: gateCheck.incomplete,
          current_stage: currentStage,
        });
      }
    }

    // Build update data
    const now = new Date().toISOString();
    const updateData = {};

    if (target_stage === 'completed') {
      updateData.current_stage = 'leverans';
      updateData.status = 'klar';
    } else {
      updateData.current_stage = target_stage;
      updateData.status = 'p_g_r';
    }

    const timestampField = STAGE_TIMESTAMPS[target_stage];
    if (timestampField) {
      updateData[timestampField] = now;
    }

    // Update WorkOrder
    const updatedWO = await prisma.workOrder.update({
      where: { id: workOrder.id },
      data: updateData,
    });

    // If completed, update linked Order (best effort)
    let orderUpdateWarning = null;
    if (target_stage === 'completed' && workOrder.order_id) {
      try {
        await prisma.order.update({
          where: { id: workOrder.order_id },
          data: { status: 'MONTERING' },
        });
      } catch (err) {
        orderUpdateWarning = `Order update failed: ${err.message}`;
        console.error(`[WARN] updateWorkOrderStage: Order update failed after WO completion: ${err.message}`);
      }
    }

    // Log activity
    try {
      const isCompletion = target_stage === 'completed';
      const logMessage = isCompletion
        ? 'Arbetsorder slutförd'
        : `Fas ändrades: "${STAGE_LABELS[currentStage] || currentStage}" → "${STAGE_LABELS[target_stage] || target_stage}"`;

      await prisma.workOrderActivity.create({
        data: {
          work_order_id: workOrder.id,
          type: 'status_change',
          message: logMessage,
          field_name: isCompletion ? 'Status' : 'Fas',
          old_value: STAGE_LABELS[currentStage] || currentStage,
          new_value: isCompletion ? 'Klar' : (STAGE_LABELS[target_stage] || target_stage),
          actor_email: user.email,
          actor_name: escapeHtml(user.full_name || user.email),
          is_decision: false,
        },
      });
    } catch (logErr) {
      console.error('[WARN] updateWorkOrderStage: Activity log failed:', logErr.message);
    }

    return res.json({
      success: true,
      workOrder: updatedWO,
      previous_stage: currentStage,
      new_stage: target_stage === 'completed' ? 'leverans' : target_stage,
      status: target_stage === 'completed' ? 'klar' : 'p_g_r',
      transition_type: transition,
      order_update_warning: orderUpdateWarning,
    });
  } catch (error) {
    next(error);
  }
}
