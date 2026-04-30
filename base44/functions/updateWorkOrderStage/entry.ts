import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// ─────────────────────────────────────────────────────────────
// Stage configuration
// ─────────────────────────────────────────────────────────────

const STAGE_ORDER = ['konstruktion', 'produktion', 'lager', 'montering', 'leverans'];

const STAGE_LABELS: Record<string, string> = {
  konstruktion: 'Konstruktion',
  produktion: 'Produktion',
  lager: 'Lager',
  montering: 'Montering',
  leverans: 'Leverans',
  completed: 'Slutförd',
};

// Gates required BEFORE leaving a stage (checklist must be complete)
const STAGE_GATES: Record<string, Array<{ field: string; label: string }>> = {
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

// Timestamp fields set when ENTERING a stage
const STAGE_TIMESTAMPS: Record<string, string> = {
  produktion: 'production_started_date',
  lager: 'picking_started_date',
  montering: 'picking_completed_date',
  leverans: 'production_completed_date',
  completed: 'production_completed_date',
};

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function getTransitionType(current: string, target: string): 'forward' | 'backward' | 'same' | 'invalid' {
  // Completion is a special forward transition from leverans
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

function validateGates(workOrder: any, stage: string): { valid: boolean; incomplete: Array<{ field: string; label: string }> } {
  const gates = STAGE_GATES[stage] || [];
  const checklist = workOrder.checklist || {};
  const incomplete = gates.filter((g) => !checklist[g.field]);
  return { valid: incomplete.length === 0, incomplete };
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ─────────────────────────────────────────────────────────────
// Main handler
// ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // 1. Authenticate
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse input
    const { work_order_id, target_stage } = await req.json();
    if (!work_order_id || !target_stage) {
      return Response.json(
        { error: 'Missing required fields: work_order_id, target_stage' },
        { status: 400 }
      );
    }

    // 3. Fetch WorkOrder
    const woList = await base44.asServiceRole.entities.WorkOrder.filter({ id: work_order_id });
    const workOrder = woList?.[0];
    if (!workOrder) {
      return Response.json({ error: 'WorkOrder not found' }, { status: 404 });
    }

    const currentStage = workOrder.current_stage;
    const transition = getTransitionType(currentStage, target_stage);

    // 4. Validate transition
    if (transition === 'invalid') {
      const currentIdx = STAGE_ORDER.indexOf(currentStage);
      const allowedForward = currentIdx >= 0 && currentIdx < STAGE_ORDER.length - 1
        ? [STAGE_ORDER[currentIdx + 1]]
        : [];
      const allowedBackward = currentIdx > 0 ? [STAGE_ORDER[currentIdx - 1]] : [];

      return Response.json({
        error: `Invalid transition: cannot move from "${currentStage}" to "${target_stage}"`,
        current_stage: currentStage,
        allowed_next_stages: [...allowedForward, ...allowedBackward],
      }, { status: 400 });
    }

    if (transition === 'same') {
      return Response.json({
        success: true,
        workOrder,
        message: 'Already at this stage',
        previous_stage: currentStage,
        new_stage: currentStage,
      });
    }

    // 5. Validate gates for forward transitions
    if (transition === 'forward') {
      const gateCheck = validateGates(workOrder, currentStage);
      if (!gateCheck.valid) {
        return Response.json({
          error: 'Stage gates incomplete',
          incomplete_gates: gateCheck.incomplete,
          current_stage: currentStage,
        }, { status: 400 });
      }
    }

    // 6. Build update data
    const now = new Date().toISOString();
    const updateData: Record<string, any> = {};

    if (target_stage === 'completed') {
      // Completion: stay in leverans stage, set status to klar
      updateData.current_stage = 'leverans';
      updateData.status = 'klar';
    } else {
      // Normal stage advance
      updateData.current_stage = target_stage;
      updateData.status = 'pågår';
    }

    // Set timestamp for the target stage
    const timestampField = STAGE_TIMESTAMPS[target_stage];
    if (timestampField) {
      updateData[timestampField] = now;
    }

    // 7. Update WorkOrder
    const updatedWO = await base44.asServiceRole.entities.WorkOrder.update(
      workOrder.id,
      updateData
    );

    // 8. If completed, update linked Order (best effort)
    let orderUpdateWarning: string | null = null;

    if (target_stage === 'completed' && workOrder.order_id) {
      try {
        await base44.asServiceRole.entities.Order.update(workOrder.order_id, {
          status: 'MONTERING',
        });
      } catch (err: any) {
        orderUpdateWarning = `Order update failed: ${err.message}`;
        console.error(`[WARN] updateWorkOrderStage: Order update failed after WO completion: ${err.message}`);
      }
    }

    // 9. Log activity
    try {
      const isCompletion = target_stage === 'completed';
      const logMessage = isCompletion
        ? 'Arbetsorder slutförd'
        : `Fas ändrades: "${STAGE_LABELS[currentStage] || currentStage}" → "${STAGE_LABELS[target_stage] || target_stage}"`;

      await base44.asServiceRole.entities.WorkOrderActivity.create({
        work_order_id: workOrder.id,
        type: 'status_change',
        message: logMessage,
        field_name: isCompletion ? 'Status' : 'Fas',
        old_value: STAGE_LABELS[currentStage] || currentStage,
        new_value: isCompletion ? 'Klar' : (STAGE_LABELS[target_stage] || target_stage),
        actor_email: user.email,
        actor_name: escapeHtml(user.full_name || user.email),
        is_decision: false,
      });
    } catch (logErr: any) {
      console.error('[WARN] updateWorkOrderStage: Activity log failed:', logErr.message);
    }

    // 10. Return response
    return Response.json({
      success: true,
      workOrder: updatedWO,
      previous_stage: currentStage,
      new_stage: target_stage === 'completed' ? 'leverans' : target_stage,
      status: target_stage === 'completed' ? 'klar' : 'pågår',
      transition_type: transition,
      order_update_warning: orderUpdateWarning,
    });

  } catch (error: any) {
    console.error(`[ERROR] updateWorkOrderStage: ${error.message}`);
    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
});
