/**
 * updateWorkOrderStage
 * Handles stage transitions with gate evaluation, red flags, backward transitions,
 * PhaseTransition logging, and activity logging.
 */

import { prisma } from '../lib/db.js';
import { evaluateGates } from '../services/gateService.js';

const STAGE_ORDER = ['inkorg', 'konstruktion', 'produktion', 'lager', 'montering', 'leverans'];

const STAGE_LABELS = {
  inkorg: 'Inkorg',
  konstruktion: 'Konstruktion',
  produktion: 'Produktion',
  lager: 'Lager',
  montering: 'Montering',
  leverans: 'Leverans',
  completed: 'Slutförd',
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
  if (targetIdx > currentIdx) return 'forward';
  if (targetIdx < currentIdx) return 'backward';
  return 'invalid';
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

    const { work_order_id, target_stage, comment, force = false } = req.body;
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

    // Evaluate gates for forward transitions
    let redFlags = [];
    let gateResult = null;

    if (transition === 'forward') {
      gateResult = await evaluateGates(work_order_id, currentStage);

      if (!gateResult.allHardMet && !force) {
        return res.status(409).json({
          error: 'GATE_NOT_MET',
          message: 'Hårda gate-villkor är inte uppfyllda',
          details: {
            hardBlockers: gateResult.items.filter((i) => i.severity === 'hard' && (i.status === 'auto_pending' || i.status === 'manual_pending')),
            softBlockers: gateResult.items.filter((i) => i.severity === 'soft' && (i.status === 'auto_pending' || i.status === 'manual_pending')),
            canForce: gateResult.hardBlockers === 0,
          },
        });
      }

      if (!gateResult.allMet) {
        // Collect red flags for incomplete soft gates
        redFlags = gateResult.items
          .filter((i) => i.status !== 'auto_ok' && i.status !== 'manual_ok')
          .map((i) => i.key);
      }
    }

    // Backward transition requires comment
    if (transition === 'backward' && !comment) {
      return res.status(422).json({
        error: 'COMMENT_REQUIRED',
        message: 'Bakåtflyttning kräver en kommentar med anledning',
      });
    }

    // Build update data
    const now = new Date();
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
      updateData[timestampField] = now.toISOString();
    }

    // Red flag tracking
    if (redFlags.length > 0) {
      updateData.red_flag_active = true;
      updateData.red_flag_reasons = redFlags;
    } else if (transition === 'forward') {
      // Clear red flag if moving forward and all gates met
      updateData.red_flag_active = false;
      updateData.red_flag_reasons = [];
    }

    // Back-forth count
    if (transition === 'backward') {
      updateData.back_forth_count = (workOrder.back_forth_count || 0) + 1;
    }

    updateData.last_phase_changed_at = now;

    // ── Atomic transaction ──
    const [updatedWorkOrder, phaseTransition, activityLog] = await prisma.$transaction([
      prisma.workOrder.update({
        where: { id: work_order_id },
        data: updateData,
      }),
      prisma.phaseTransition.create({
        data: {
          work_order_id,
          from_phase: currentStage,
          to_phase: target_stage === 'completed' ? 'leverans' : target_stage,
          triggered_by: user.email || user.id,
          trigger_type: transition === 'backward' ? 'back_send' : 'manual',
          red_flags: redFlags,
          comment: comment || null,
        },
      }),
      prisma.workOrderActivity.create({
        data: {
          work_order_id,
          type: 'status_change',
          message: transition === 'backward'
            ? `Skickad tillbaka från ${STAGE_LABELS[currentStage]} till ${STAGE_LABELS[target_stage]}${comment ? ': ' + escapeHtml(comment) : ''}`
            : redFlags.length > 0
              ? `Frigjord till ${STAGE_LABELS[target_stage]} med röd flagga (${redFlags.length} ouppfyllda villkor)`
              : `Frigjord till ${STAGE_LABELS[target_stage]}`,
          actor_email: user.email,
          actor_name: user.full_name || user.email,
          metadata: {
            from_phase: currentStage,
            to_phase: target_stage,
            red_flags: redFlags,
            transition_type: transition,
            comment: comment || null,
          },
        },
      }),
    ]);

    return res.json({
      success: true,
      workOrder: updatedWorkOrder,
      transition: phaseTransition,
      redFlagsRaised: redFlags,
      previous_stage: currentStage,
      new_stage: updatedWorkOrder.current_stage,
      message: transition === 'backward'
        ? `Skickad tillbaka till ${STAGE_LABELS[target_stage]}`
        : `Frigjord till ${STAGE_LABELS[target_stage]}`,
    });

  } catch (error) {
    console.error('updateWorkOrderStage error:', error);
    next(error);
  }
}
