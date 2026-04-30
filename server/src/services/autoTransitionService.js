import { prisma } from '../lib/db.js';
import { evaluateGates } from './gateService.js';

const STAGE_ORDER = ['inkorg', 'konstruktion', 'produktion', 'lager', 'montering', 'leverans'];

/**
 * Check if a WorkOrder in 'lager' phase is ready to auto-transition to 'montering'.
 * Called after any WorkOrderMaterial update.
 */
export async function checkAutoTransition(workOrderId) {
  const workOrder = await prisma.workOrder.findUnique({
    where: { id: workOrderId },
  });

  if (!workOrder || workOrder.current_stage !== 'lager') return null;

  const materials = await prisma.workOrderMaterial.findMany({
    where: { work_order_id: workOrderId },
  });

  // Check if all materials are handled (picked or marked not_needed)
  const allHandled = materials.length > 0 && materials.every(
    (m) => m.quantity_picked >= m.quantity_needed || m.status === 'not_needed'
  );

  if (!allHandled) return null;

  // Evaluate gates for lager phase
  const gateResult = await evaluateGates(workOrderId, 'lager');
  if (!gateResult.allHardMet) return null;

  // All conditions met — perform auto-transition
  const now = new Date();
  const targetStage = 'montering';

  const [updatedWorkOrder, phaseTransition, activityLog] = await prisma.$transaction([
    prisma.workOrder.update({
      where: { id: workOrderId },
      data: {
        current_stage: targetStage,
        status: 'p_g_r',
        picking_completed_date: now,
        last_phase_changed_at: now,
        red_flag_active: false,
        red_flag_reasons: [],
      },
    }),
    prisma.phaseTransition.create({
      data: {
        work_order_id: workOrderId,
        from_phase: 'lager',
        to_phase: targetStage,
        triggered_by: 'system',
        trigger_type: 'automatic',
        red_flags: [],
        comment: 'Alla BOM-rader plockade — automatisk övergång',
      },
    }),
    prisma.workOrderActivity.create({
      data: {
        work_order_id: workOrderId,
        type: 'status_change',
        message: 'Automatisk övergång: Lager → Montering (alla rader plockade)',
        actor_email: 'system',
        actor_name: 'System',
        metadata: {
          from_phase: 'lager',
          to_phase: targetStage,
          transition_type: 'automatic',
          auto_trigger: 'all_materials_picked',
        },
      },
    }),
  ]);

  // Broadcast notification
  broadcastEvent('phase-transition', {
    work_order_id: workOrderId,
    from_phase: 'lager',
    to_phase: targetStage,
    type: 'automatic',
    order_number: updatedWorkOrder.order_number,
    customer_name: updatedWorkOrder.customer_name,
  });

  return { updatedWorkOrder, phaseTransition };
}

let wss = null;

export function setWss(instance) {
  wss = instance;
}

export function broadcastEvent(type, payload) {
  if (!wss) return;
  const message = JSON.stringify({ type, payload, timestamp: new Date().toISOString() });
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(message);
    }
  });
}
