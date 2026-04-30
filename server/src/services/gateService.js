import { prisma } from '../index.js';

/**
 * Evaluate gate checklist items for a work order and phase.
 * Auto-evaluated items are computed from existing data.
 * Returns { items, completed, total, hardBlockers, softBlockers }
 */
export async function evaluateGates(workOrderId, phase) {
  const workOrder = await prisma.workOrder.findUnique({
    where: { id: workOrderId },
    include: {
      roles: true,
    },
  });

  if (!workOrder) throw new Error('WorkOrder not found');

  const materials = await prisma.workOrderMaterial.findMany({
    where: { work_order_id: workOrderId },
  });

  const templates = await prisma.gateChecklistTemplate.findMany({
    where: { phase, active: true },
    orderBy: { sort_order: 'asc' },
  });

  const existingItems = await prisma.gateChecklistItem.findMany({
    where: { work_order_id: workOrderId, phase },
  });

  const items = [];
  let completed = 0;
  let hardBlockers = 0;
  let softBlockers = 0;

  for (const tmpl of templates) {
    let item = existingItems.find((i) => i.key === tmpl.key);

    // Auto-evaluate if needed
    let status = item?.status || 'auto_pending';
    if (tmpl.auto_evaluated) {
      const isMet = await evaluateAutoRule(tmpl.key, workOrder, materials);
      status = isMet ? 'auto_ok' : 'auto_pending';
    }

    // Upsert if changed or missing
    if (!item || item.status !== status) {
      item = await prisma.gateChecklistItem.upsert({
        where: {
          work_order_id_phase_key: {
            work_order_id: workOrderId,
            phase,
            key: tmpl.key,
          },
        },
        update: { status },
        create: {
          work_order_id: workOrderId,
          phase,
          key: tmpl.key,
          label: tmpl.label,
          status,
          severity: tmpl.severity,
          auto_evaluated: tmpl.auto_evaluated,
          sort_order: tmpl.sort_order,
        },
      });
    }

    const isOk = status === 'auto_ok' || status === 'manual_ok';
    if (isOk) completed++;
    else if (tmpl.severity === 'hard') hardBlockers++;
    else softBlockers++;

    items.push({
      id: item.id,
      key: item.key,
      label: item.label,
      status: item.status,
      severity: item.severity,
      autoEvaluated: item.auto_evaluated,
      completedAt: item.completed_at,
    });
  }

  return {
    items,
    completed,
    total: templates.length,
    hardBlockers,
    softBlockers,
    allHardMet: hardBlockers === 0,
    allMet: completed === templates.length,
  };
}

async function evaluateAutoRule(key, workOrder, materials) {
  switch (key) {
    case 'konstruktion.ritning_uppladdad':
      return !!workOrder.drawing_url;

    case 'konstruktion.bom_komplett': {
      // Check if materials_needed has items OR WorkOrderMaterial rows exist
      const hasMaterials = Array.isArray(workOrder.materials_needed) && workOrder.materials_needed.length > 0;
      return hasMaterials || (materials.length > 0);
    }

    case 'konstruktion.anteckningar_ifyllda': {
      const notes = workOrder.workorder_notes || '';
      return notes.length >= 50;
    }

    case 'produktion.konfig_anteckningar': {
      const notes = workOrder.production_notes || '';
      return notes.length >= 50;
    }

    case 'produktion.bild_konfigurerad':
      return Array.isArray(workOrder.assembly_images) && workOrder.assembly_images.length > 0;

    case 'lager.alla_rader_hanterade': {
      // All materials must be picked OR marked missing
      if (materials.length === 0) return false;
      return materials.every((m) => m.quantity_picked >= m.quantity_needed || m.status === 'not_needed');
    }

    case 'montering.checklista_klar': {
      const checklist = workOrder.checklist || {};
      const items = Object.values(checklist);
      if (items.length === 0) return false;
      return items.every((v) => v === true);
    }

    case 'montering.testprotokoll':
      return !!workOrder.test_protocol_url;

    case 'montering.kvalitetsrapport':
      return !!workOrder.quality_report_url;

    case 'montering.bilder_minst_3':
      return Array.isArray(workOrder.assembly_images) && workOrder.assembly_images.length >= 3;

    case 'leverans.pod_uppladdad':
      return !!workOrder.signed_off_by;

    default:
      return false;
  }
}

/**
 * Toggle a manual gate item
 */
export async function toggleGateItem(itemId, userId) {
  const item = await prisma.gateChecklistItem.findUnique({ where: { id: itemId } });
  if (!item) throw new Error('Gate item not found');
  if (item.auto_evaluated) throw new Error('Cannot toggle auto-evaluated item');

  const newStatus = item.status === 'manual_ok' ? 'manual_pending' : 'manual_ok';
  return prisma.gateChecklistItem.update({
    where: { id: itemId },
    data: {
      status: newStatus,
      completed_at: newStatus === 'manual_ok' ? new Date() : null,
      completed_by: newStatus === 'manual_ok' ? userId : null,
    },
  });
}
